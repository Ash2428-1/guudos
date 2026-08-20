import 'server-only';
import { requireManager, requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import {
  type MovementLeg,
  type MovementOrderFields,
  type PocContact,
  type TeamMember,
} from '@/lib/work-orders';

export type { MovementOrderFields };

export interface MovementOrderRow extends MovementOrderFields {
  id: string;
  workOrderId: string | null;
  status: string;
  createdAt: string;
  legs: MovementLeg[];
}

// Crew roster role -> Movement Order team role.
const TEAM_ROLE: Record<string, string> = {
  Operator: 'Operator',
  Nurse: 'PHC / Nurse',
  Optometrist: 'Optometrist',
  'Optical Dispenser': 'Optical Dispenser',
  'Mobile Unit Manager': 'MUM',
};

/** Pull a mobile's crew (from the roster) as a Movement Order team. */
export async function getMobileTeam(locationId: string): Promise<TeamMember[]> {
  await requireManager();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('mobile_crew')
    .select('role, name')
    .eq('location_id', locationId);
  return ((data ?? []) as Array<{ role: string; name: string }>)
    .filter((c) => TEAM_ROLE[c.role])
    .map((c) => ({ role: TEAM_ROLE[c.role], name: c.name, phone: '' }));
}

function mapRow(r: Record<string, unknown>): Omit<MovementOrderRow, 'legs'> {
  const s = (k: string) => (r[k] as string | null) ?? null;
  return {
    id: r.id as string,
    workOrderId: (r.work_order_id as string | null) ?? null,
    status: (r.status as string) ?? 'draft',
    createdAt: r.created_at as string,
    projectName: s('project_name'),
    manager: s('manager'),
    region: s('region'),
    reasonForTravel: s('reason_for_travel'),
    macName: s('mac_name'),
    macReg: s('mac_reg'),
    province: s('province'),
    startDate: s('start_date'),
    startingPoint: s('starting_point'),
    locationId: s('location_id'),
    team: (r.team as TeamMember[] | null) ?? [],
    pocContacts: (r.poc_contacts as PocContact[] | null) ?? [],
  };
}

export async function createMovementFromWorkOrder(workOrderId: string): Promise<string> {
  const ctx = await requireManager();
  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('client_name, services, sites')
    .eq('id', workOrderId)
    .maybeSingle();
  const w = wo as { client_name: string | null; services: string | null; sites: string | null } | null;
  const { data, error } = await supabase
    .from('movement_orders')
    .insert({
      organization_id: ctx.organizationId,
      work_order_id: workOrderId,
      created_by: ctx.userId,
      project_name: w?.client_name ? `${w.client_name} — Movement` : null,
      manager: ctx.fullName,
      reason_for_travel: w?.services ?? null,
      province: w?.sites ?? null,
      team: [],
      poc_contacts: [],
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function getMovementOrder(id: string): Promise<MovementOrderRow | null> {
  await requireSession(); // viewable on-mobile; RLS scopes to the org
  const supabase = await createSupabaseServerClient();
  const { data: mo } = await supabase.from('movement_orders').select('*').eq('id', id).maybeSingle();
  if (!mo) return null;
  const { data: legRows } = await supabase
    .from('movement_legs')
    .select('*')
    .eq('movement_order_id', id)
    .order('seq');
  const legs: MovementLeg[] = ((legRows ?? []) as Array<Record<string, unknown>>).map((r) => ({
    date: (r.leg_date as string | null) ?? null,
    from: (r.from_loc as string | null) ?? '',
    to: (r.to_loc as string | null) ?? '',
    detail: (r.detail as string | null) ?? '',
    notes: (r.notes as string | null) ?? '',
    mapsLink: (r.maps_link as string | null) ?? '',
  }));
  return { ...mapRow(mo as Record<string, unknown>), legs };
}

export interface MovementOrderSummary {
  id: string;
  projectName: string | null;
  startDate: string | null;
  status: string;
}

export async function listMovementOrders(): Promise<MovementOrderSummary[]> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('movement_orders')
    .select('id, project_name, start_date, status')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    projectName: (r.project_name as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    status: (r.status as string) ?? 'draft',
  }));
}

export async function saveMovementOrder(
  id: string,
  fields: MovementOrderFields,
  legs: MovementLeg[],
): Promise<void> {
  await requireManager();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('movement_orders')
    .update({
      project_name: fields.projectName,
      manager: fields.manager,
      region: fields.region,
      reason_for_travel: fields.reasonForTravel,
      mac_name: fields.macName,
      mac_reg: fields.macReg,
      province: fields.province,
      start_date: fields.startDate || null,
      starting_point: fields.startingPoint,
      location_id: fields.locationId,
      team: fields.team,
      poc_contacts: fields.pocContacts,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  await supabase.from('movement_legs').delete().eq('movement_order_id', id);
  const rows = legs
    .filter((l) => l.date || l.from || l.to || l.detail)
    .map((l, i) => ({
      movement_order_id: id,
      seq: i,
      leg_date: l.date || null,
      from_loc: l.from,
      to_loc: l.to,
      detail: l.detail,
      notes: l.notes,
      maps_link: l.mapsLink,
    }));
  if (rows.length) {
    const { error: legErr } = await supabase.from('movement_legs').insert(rows);
    if (legErr) throw new Error(legErr.message);
  }
}
