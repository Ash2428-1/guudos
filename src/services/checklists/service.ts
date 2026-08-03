import 'server-only';
import { requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { evaluateFlag } from '@/domain/checklists/flags';
import { computeProgress } from '@/domain/checklists/status';
import {
  type ChecklistItemDef,
  type InstanceStatus,
  type ResponseValue,
} from '@/lib/checklists';
import { type JobFunction } from '@/lib/roles';

/** Today's date in Guud's operating timezone (Cape Town). */
function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
  }).format(new Date());
}

export interface ChecklistRow {
  templateId: string;
  templateName: string;
  targetJob: JobFunction | null;
  locationId: string;
  locationName: string;
  instanceId: string | null;
  status: InstanceStatus;
}

/**
 * Every active template × mobile the user can access, with today's instance
 * status if one exists. No writes — instances are created on open.
 */
export async function getTodaysChecklists(): Promise<ChecklistRow[]> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();

  const [{ data: locs }, { data: tmpls }, { data: insts }] = await Promise.all([
    supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', ctx.organizationId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('checklist_templates')
      .select('id, name, target_job')
      .eq('organization_id', ctx.organizationId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('checklist_instances')
      .select('id, template_id, location_id, status')
      .eq('service_date', today()),
  ]);

  const locations = (locs ?? []) as Array<{ id: string; name: string }>;
  const templates = (tmpls ?? []) as Array<{
    id: string;
    name: string;
    target_job: JobFunction | null;
  }>;
  const instances = (insts ?? []) as Array<{
    id: string;
    template_id: string;
    location_id: string;
    status: InstanceStatus;
  }>;

  const rows: ChecklistRow[] = [];
  for (const loc of locations) {
    for (const t of templates) {
      const inst = instances.find(
        (i) => i.template_id === t.id && i.location_id === loc.id,
      );
      rows.push({
        templateId: t.id,
        templateName: t.name,
        targetJob: t.target_job,
        locationId: loc.id,
        locationName: loc.name,
        instanceId: inst?.id ?? null,
        status: inst?.status ?? 'pending',
      });
    }
  }
  return rows;
}

/** Find or create today's instance for a template on a mobile; returns its id. */
export async function ensureInstance(
  templateId: string,
  locationId: string,
): Promise<string> {
  await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('checklist_instances')
    .upsert(
      { template_id: templateId, location_id: locationId, service_date: today() },
      { onConflict: 'template_id,location_id,service_date', ignoreDuplicates: false },
    )
    .select('id')
    .single();
  if (error) throw new Error(`ensureInstance failed: ${error.message}`);
  return (data as { id: string }).id;
}

export interface InstanceDetail {
  instanceId: string;
  templateName: string;
  locationId: string;
  status: InstanceStatus;
  items: ChecklistItemDef[];
  responses: Record<string, ResponseValue>;
}

export async function getInstanceDetail(
  instanceId: string,
): Promise<InstanceDetail | null> {
  await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: inst } = await supabase
    .from('checklist_instances')
    .select('id, location_id, status, template_id, checklist_templates(name)')
    .eq('id', instanceId)
    .maybeSingle();
  if (!inst) return null;

  const instance = inst as {
    id: string;
    location_id: string;
    status: InstanceStatus;
    template_id: string;
    checklist_templates: { name: string } | { name: string }[] | null;
  };
  const tmpl = Array.isArray(instance.checklist_templates)
    ? instance.checklist_templates[0]
    : instance.checklist_templates;

  const [{ data: rawItems }, { data: rawResponses }] = await Promise.all([
    supabase
      .from('checklist_items')
      .select('*')
      .eq('template_id', instance.template_id)
      .order('position'),
    supabase
      .from('checklist_responses')
      .select('*')
      .eq('instance_id', instanceId),
  ]);

  const items: ChecklistItemDef[] = (
    (rawItems ?? []) as Array<Record<string, unknown>>
  ).map((r) => ({
    id: r.id as string,
    position: r.position as number,
    label: r.label as string,
    inputType: r.input_type as ChecklistItemDef['inputType'],
    required: r.required as boolean,
    flagWhenFalse: r.flag_when_false as boolean,
    minValue: (r.min_value as number | null) ?? null,
    maxValue: (r.max_value as number | null) ?? null,
  }));

  const responses: Record<string, ResponseValue> = {};
  for (const r of (rawResponses ?? []) as Array<Record<string, unknown>>) {
    responses[r.item_id as string] = {
      valueBool: (r.value_bool as boolean | null) ?? null,
      valueNumber: (r.value_number as number | null) ?? null,
      valueText: (r.value_text as string | null) ?? null,
    };
  }

  return {
    instanceId: instance.id,
    templateName: tmpl?.name ?? 'Checklist',
    locationId: instance.location_id,
    status: instance.status,
    items,
    responses,
  };
}

/**
 * Save responses, evaluate flags, update status, and raise a ticket for each
 * newly-flagged item (deduped by response). Returns how many tickets were raised.
 */
export async function submitChecklist(
  instanceId: string,
  values: Record<string, ResponseValue>,
): Promise<{ status: InstanceStatus; ticketsRaised: number }> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();

  const detail = await getInstanceDetail(instanceId);
  if (!detail) throw new Error('Checklist not found');

  // Resolve the mobile's org for ticket ownership.
  const { data: loc } = await supabase
    .from('locations')
    .select('organization_id')
    .eq('id', detail.locationId)
    .single();
  const organizationId = (loc as { organization_id: string }).organization_id;

  // Build response rows with evaluated flags.
  const rows = detail.items
    .filter((item) => values[item.id] !== undefined)
    .map((item) => {
      const v = values[item.id];
      return {
        item,
        row: {
          instance_id: instanceId,
          item_id: item.id,
          value_bool: v.valueBool ?? null,
          value_number: v.valueNumber ?? null,
          value_text: v.valueText ?? null,
          flagged: evaluateFlag(item, v),
        },
      };
    });

  const { data: saved, error: upsertErr } = await supabase
    .from('checklist_responses')
    .upsert(
      rows.map((r) => r.row),
      { onConflict: 'instance_id,item_id' },
    )
    .select('id, item_id, flagged');
  if (upsertErr) throw new Error(`Saving responses failed: ${upsertErr.message}`);

  // Status from the full merged picture.
  const merged = new Map<string, ResponseValue>(
    Object.entries(detail.responses),
  );
  for (const [k, v] of Object.entries(values)) merged.set(k, v);
  const { status } = computeProgress(detail.items, merged);

  await supabase
    .from('checklist_instances')
    .update({
      status,
      submitted_at: status === 'completed' ? new Date().toISOString() : null,
      completed_by: status === 'completed' ? ctx.userId : null,
    })
    .eq('id', instanceId);

  // Raise tickets for flagged responses that don't already have one.
  const savedRows = (saved ?? []) as Array<{
    id: string;
    item_id: string;
    flagged: boolean;
  }>;
  const flagged = savedRows.filter((r) => r.flagged);
  let ticketsRaised = 0;
  if (flagged.length) {
    const responseIds = flagged.map((r) => r.id);
    const { data: existing } = await supabase
      .from('tickets')
      .select('source_ref')
      .in('source_ref', responseIds);
    const already = new Set(
      ((existing ?? []) as Array<{ source_ref: string }>).map(
        (e) => e.source_ref,
      ),
    );
    const labelById = new Map(detail.items.map((i) => [i.id, i.label]));
    const toInsert = flagged
      .filter((r) => !already.has(r.id))
      .map((r) => ({
        organization_id: organizationId,
        location_id: detail.locationId,
        source: 'checklist',
        source_ref: r.id,
        title: `${detail.templateName}: ${labelById.get(r.item_id) ?? 'Flagged item'}`,
        description: 'Auto-raised from a flagged checklist item.',
        created_by: ctx.userId,
      }));
    if (toInsert.length) {
      const { error: tErr } = await supabase.from('tickets').insert(toInsert);
      if (!tErr) ticketsRaised = toInsert.length;
    }
  }

  return { status, ticketsRaised };
}
