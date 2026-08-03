import 'server-only';
import { requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { isTicketStatus } from '@/domain/tickets/status';
import { type TicketSource, type TicketStatus } from '@/lib/tickets';
import {
  createGuudTicketsClient,
  guudTicketsConfigured,
} from '@/infrastructure/external/guud-tickets';

export interface TicketRow {
  id: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  source: TicketSource;
  locationName: string | null;
  externalId: string | null;
  createdAt: string;
}

export async function listTickets(): Promise<TicketRow[]> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tickets')
    .select('id, title, description, status, source, external_id, created_at, locations(name)')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false });

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const loc = r.locations as { name: string } | { name: string }[] | null;
    const locName = Array.isArray(loc) ? loc[0]?.name : loc?.name;
    const status = r.status as string;
    return {
      id: r.id as string,
      title: r.title as string,
      description: (r.description as string | null) ?? null,
      status: isTicketStatus(status) ? status : 'open',
      source: (r.source as TicketSource) ?? 'manual',
      locationName: locName ?? null,
      externalId: (r.external_id as string | null) ?? null,
      createdAt: r.created_at as string,
    };
  });
}

export async function createTicket(input: {
  title: string;
  description?: string;
  locationId?: string | null;
}): Promise<void> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tickets').insert({
    organization_id: ctx.organizationId,
    location_id: input.locationId || null,
    source: 'manual',
    title: input.title,
    description: input.description ?? null,
    created_by: ctx.userId,
  });
  if (error) throw new Error(`Create ticket failed: ${error.message}`);
}

export async function setTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<void> {
  if (!isTicketStatus(status)) throw new Error('Invalid status');
  await requireSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(`Update failed: ${error.message}`);
}

export type PushResult =
  | { ok: true; externalId: string }
  | { ok: false; reason: 'not_configured' | 'error'; message?: string };

/** Push a ticket to the Guud ticket system. No-op-safe until configured. */
export async function pushTicket(id: string): Promise<PushResult> {
  await requireSession();
  if (!guudTicketsConfigured()) return { ok: false, reason: 'not_configured' };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('tickets')
    .select('title, description')
    .eq('id', id)
    .single();
  if (!data) return { ok: false, reason: 'error', message: 'Ticket not found' };

  try {
    const client = createGuudTicketsClient()!;
    const ticket = data as { title: string; description: string | null };
    const res = await client.create({
      title: ticket.title,
      description: ticket.description ?? undefined,
      reference: id,
    });
    await supabase
      .from('tickets')
      .update({ external_id: res.id, status: 'in_progress' })
      .eq('id', id);
    return { ok: true, externalId: res.id };
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      message: e instanceof Error ? e.message : 'Push failed',
    };
  }
}
