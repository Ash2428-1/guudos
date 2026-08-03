import 'server-only';
import { requireManagement } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { computeOverview, type Overview } from '@/domain/dashboard/overview';

const TZ = 'Africa/Johannesburg';

function todayInTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** Convert an ISO timestamp to a Cape Town calendar date (YYYY-MM-DD). */
function toLocalDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Regional overview for a given date (defaults to today, Cape Town). */
export async function getRegionalOverview(date?: string): Promise<Overview> {
  await requireManagement();
  const day = date && ISO_DATE.test(date) ? date : todayInTz();
  const supabase = await createSupabaseServerClient();

  const [{ data: mobiles }, { count: templateCount }, { data: instances }, { data: tickets }] =
    await Promise.all([
      supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
      supabase
        .from('checklist_templates')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('checklist_instances')
        .select('location_id, status')
        .eq('service_date', day),
      supabase.from('tickets').select('location_id, status, created_at'),
    ]);

  return computeOverview({
    date: day,
    mobiles: (mobiles ?? []) as Array<{ id: string; name: string }>,
    activeTemplateCount: templateCount ?? 0,
    instances: ((instances ?? []) as Array<{ location_id: string; status: string }>).map(
      (i) => ({ locationId: i.location_id, status: i.status }),
    ),
    tickets: (
      (tickets ?? []) as Array<{
        location_id: string | null;
        status: string;
        created_at: string;
      }>
    ).map((t) => ({
      locationId: t.location_id,
      status: t.status,
      createdDate: toLocalDate(t.created_at),
    })),
  });
}
