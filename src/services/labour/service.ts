import 'server-only';
import { requireCapability, requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { cost, hoursBetween, lateness, summarize, type LabourLine, type LabourTotals } from '@/domain/labour/calc';
import { type ClockStatus, type LabourPersonRow, type TodayEntry } from '@/lib/labour';
import { type JobFunction } from '@/lib/roles';

// Cape Town is UTC+2 year-round (no DST) — offset math is exact.
const OFFSET_MIN = 120;

function localMinutes(iso: string): number {
  const d = new Date(iso);
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + OFFSET_MIN) % 1440;
}
function localDate(iso: string): string {
  return new Date(new Date(iso).getTime() + OFFSET_MIN * 60_000)
    .toISOString()
    .slice(0, 10);
}
function todayLocal(): string {
  return new Date(Date.now() + OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}
function expectedMinutes(t: string | null): number {
  if (!t) return 8 * 60;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// --- Clock ---------------------------------------------------------------
export async function getMyClockStatus(): Promise<ClockStatus> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('time_entries')
    .select('id, location_id, clock_in, locations(name)')
    .eq('profile_id', ctx.userId)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { open: false, entryId: null, locationId: null, locationName: null, clockInISO: null };
  const row = data as { id: string; location_id: string; clock_in: string; locations: { name: string } | { name: string }[] | null };
  const loc = Array.isArray(row.locations) ? row.locations[0] : row.locations;
  return {
    open: true,
    entryId: row.id,
    locationId: row.location_id,
    locationName: loc?.name ?? null,
    clockInISO: row.clock_in,
  };
}

export async function clockIn(locationId: string): Promise<void> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const status = await getMyClockStatus();
  if (status.open) return; // already clocked in

  const { data: loc } = await supabase
    .from('locations')
    .select('expected_start_time')
    .eq('id', locationId)
    .single();
  const expected = (loc as { expected_start_time: string } | null)?.expected_start_time ?? null;

  const { error } = await supabase.from('time_entries').insert({
    organization_id: ctx.organizationId,
    profile_id: ctx.userId,
    location_id: locationId,
    expected_start: expected,
  });
  if (error) throw new Error(error.message);
}

export async function clockOut(): Promise<void> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const status = await getMyClockStatus();
  if (!status.open || !status.entryId) return;
  const { error } = await supabase
    .from('time_entries')
    .update({ clock_out: new Date().toISOString() })
    .eq('id', status.entryId)
    .eq('profile_id', ctx.userId);
  if (error) throw new Error(error.message);
}

export async function getTodayEntries(): Promise<TodayEntry[]> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('time_entries')
    .select('id, clock_in, clock_out, locations(name)')
    .eq('profile_id', ctx.userId)
    .order('clock_in', { ascending: false })
    .limit(20);

  const today = todayLocal();
  return ((data ?? []) as Array<Record<string, unknown>>)
    .filter((r) => localDate(r.clock_in as string) === today)
    .map((r) => {
      const loc = r.locations as { name: string } | { name: string }[] | null;
      const outISO = (r.clock_out as string | null) ?? null;
      return {
        id: r.id as string,
        locationName: Array.isArray(loc) ? (loc[0]?.name ?? null) : (loc?.name ?? null),
        clockInISO: r.clock_in as string,
        clockOutISO: outISO,
        hours: outISO ? hoursBetween(new Date(r.clock_in as string).getTime(), new Date(outISO).getTime()) : 0,
      };
    });
}

// --- Labour summary ------------------------------------------------------
export interface LabourSummary {
  from: string;
  to: string;
  rows: LabourPersonRow[];
  totals: LabourTotals;
}

export async function getLabourSummary(
  from?: string,
  to?: string,
): Promise<LabourSummary> {
  await requireCapability('view_labour');
  const supabase = await createSupabaseServerClient();

  const today = todayLocal();
  const toDay = to ?? today;
  const fromDay =
    from ??
    new Date(new Date(`${toDay}T00:00:00Z`).getTime() - 6 * 86_400_000)
      .toISOString()
      .slice(0, 10);

  const { data: rawEntries } = await supabase
    .from('time_entries')
    .select('profile_id, clock_in, clock_out, expected_start')
    .gte('clock_in', `${fromDay}T00:00:00+02:00`)
    .lte('clock_in', `${toDay}T23:59:59+02:00`);

  const entries = (rawEntries ?? []) as Array<{
    profile_id: string;
    clock_in: string;
    clock_out: string | null;
    expected_start: string | null;
  }>;

  const profileIds = [...new Set(entries.map((e) => e.profile_id))];
  const [{ data: profs }, { data: rates }] = await Promise.all([
    profileIds.length
      ? supabase.from('profiles').select('id, full_name, job_function').in('id', profileIds)
      : Promise.resolve({ data: [] as unknown }),
    supabase.from('pay_rates').select('profile_id, job_function, hourly_rate'),
  ]);

  const profiles = new Map(
    ((profs ?? []) as Array<{ id: string; full_name: string | null; job_function: JobFunction | null }>).map(
      (p) => [p.id, p],
    ),
  );
  const rateList = (rates ?? []) as Array<{
    profile_id: string | null;
    job_function: JobFunction | null;
    hourly_rate: number;
  }>;

  const resolveRate = (pid: string, job: JobFunction | null): number | null => {
    const personal = rateList.find((r) => r.profile_id === pid);
    if (personal) return personal.hourly_rate;
    const byJob = rateList.find((r) => r.profile_id === null && r.job_function === job);
    return byJob ? byJob.hourly_rate : null;
  };

  // Aggregate per profile.
  const acc = new Map<string, { lines: LabourLine[]; rate: number | null }>();
  for (const e of entries) {
    const prof = profiles.get(e.profile_id);
    const rate = resolveRate(e.profile_id, prof?.job_function ?? null);
    const hours = e.clock_out
      ? hoursBetween(new Date(e.clock_in).getTime(), new Date(e.clock_out).getTime())
      : 0;
    const lateMin = lateness(localMinutes(e.clock_in), expectedMinutes(e.expected_start));
    const line: LabourLine = { hours, lateMinutes: lateMin, cost: cost(hours, rate ?? 0) };
    const cur = acc.get(e.profile_id) ?? { lines: [], rate };
    cur.lines.push(line);
    acc.set(e.profile_id, cur);
  }

  const rows: LabourPersonRow[] = [...acc.entries()].map(([pid, { lines, rate }]) => {
    const t = summarize(lines);
    return {
      profileId: pid,
      name: profiles.get(pid)?.full_name ?? 'Unknown',
      shifts: lines.length,
      hours: t.hours,
      lateCount: t.lateCount,
      lateMinutes: t.lateMinutes,
      cost: t.cost,
      hasRate: rate !== null,
    };
  });
  rows.sort((a, b) => b.hours - a.hours);

  return { from: fromDay, to: toDay, rows, totals: summarize(rows) };
}
