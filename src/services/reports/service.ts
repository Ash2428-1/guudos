import 'server-only';
import { requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { listAccessibleMobiles } from '@/services/locations/service';
import { cumulativeBacklog, serviceDurationMinutes } from '@/domain/reports/calc';
import {
  type DailyReportFields,
  type DailyReportView,
} from '@/lib/reports';

const OFFSET_MIN = 120; // SAST (UTC+2, no DST)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function localDay(offsetDays = 0): string {
  return new Date(Date.now() + OFFSET_MIN * 60_000 + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

type Row = Record<string, unknown>;

function mapFields(r: Row): DailyReportFields {
  return {
    startOfServices: hhmm(r.start_of_services as string | null),
    endOfServices: hhmm(r.end_of_services as string | null),
    firstEnrolledAt: hhmm(r.first_enrolled_at as string | null),
    firstPhcAt: hhmm(r.first_phc_at as string | null),
    avgPhcMinutes: (r.avg_phc_minutes as number | null) ?? null,
    specsDispensed: (r.specs_dispensed as number | null) ?? null,
    specsNoStock: (r.specs_no_stock as number | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  };
}

const EMPTY: DailyReportFields = {
  startOfServices: null,
  endOfServices: null,
  firstEnrolledAt: null,
  firstPhcAt: null,
  avgPhcMinutes: null,
  specsDispensed: null,
  specsNoStock: null,
  notes: null,
};

export async function getDailyReport(
  locationId: string,
  date: string,
): Promise<DailyReportFields> {
  await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('location_id', locationId)
    .eq('service_date', date)
    .maybeSingle();
  return data ? mapFields(data as Row) : EMPTY;
}

export async function upsertDailyReport(
  locationId: string,
  date: string,
  fields: DailyReportFields,
): Promise<void> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('daily_reports').upsert(
    {
      organization_id: ctx.organizationId,
      location_id: locationId,
      service_date: date,
      start_of_services: fields.startOfServices,
      end_of_services: fields.endOfServices,
      first_enrolled_at: fields.firstEnrolledAt,
      first_phc_at: fields.firstPhcAt,
      avg_phc_minutes: fields.avgPhcMinutes,
      specs_dispensed: fields.specsDispensed,
      specs_no_stock: fields.specsNoStock,
      notes: fields.notes,
      submitted_by: ctx.userId,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'location_id,service_date' },
  );
  if (error) throw new Error(error.message);
}

export interface ReportBack {
  date: string;
  mobiles: DailyReportView[];
}

/** Report-back for a day (defaults to yesterday) across the user's mobiles. */
export async function getReportBack(date?: string): Promise<ReportBack> {
  await requireSession();
  const day = date && ISO_DATE.test(date) ? date : localDay(-1);
  const supabase = await createSupabaseServerClient();

  const mobiles = await listAccessibleMobiles();
  const [{ data: dayRows }, { data: histRows }] = await Promise.all([
    supabase.from('daily_reports').select('*').eq('service_date', day),
    supabase
      .from('daily_reports')
      .select('location_id, service_date, specs_no_stock')
      .lte('service_date', day),
  ]);

  const byLoc = new Map(
    ((dayRows ?? []) as Row[]).map((r) => [r.location_id as string, r]),
  );
  const histByLoc = new Map<string, Array<{ date: string; noStock: number }>>();
  for (const h of (histRows ?? []) as Row[]) {
    const id = h.location_id as string;
    const list = histByLoc.get(id) ?? [];
    list.push({
      date: h.service_date as string,
      noStock: (h.specs_no_stock as number | null) ?? 0,
    });
    histByLoc.set(id, list);
  }

  const views: DailyReportView[] = mobiles.map((m) => {
    const r = byLoc.get(m.id);
    const fields = r ? mapFields(r) : EMPTY;
    return {
      locationId: m.id,
      locationName: m.name,
      date: day,
      hasReport: Boolean(r),
      serviceMinutes: serviceDurationMinutes(
        fields.startOfServices,
        fields.endOfServices,
      ),
      cumulativeBacklog: cumulativeBacklog(histByLoc.get(m.id) ?? [], day),
      ...fields,
    };
  });

  return { date: day, mobiles: views };
}

export { localDay };
