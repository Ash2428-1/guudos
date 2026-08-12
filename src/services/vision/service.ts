import 'server-only';
import { requireCapability, requireSession } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { computeVision, type VisionRow } from '@/domain/vision/calc';
import { type VisionSummary } from '@/lib/vision';

const OFFSET_MIN = 120; // SAST
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function localDay(off = 0): string {
  return new Date(Date.now() + OFFSET_MIN * 60_000 + off * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export async function getVisionSummary(
  from?: string,
  to?: string,
): Promise<VisionSummary> {
  await requireCapability('view_vision');
  const toDay = to && ISO.test(to) ? to : localDay(0);
  const fromDay = from && ISO.test(from) ? from : localDay(-29);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('vision_entries')
    .select('location_id, specs_cut, specs_not_cut, locations(name)')
    .gte('entry_date', fromDay)
    .lte('entry_date', toDay);

  const rows: VisionRow[] = ((data ?? []) as Array<Record<string, unknown>>).map(
    (r) => {
      const loc = r.locations as { name: string } | { name: string }[] | null;
      return {
        locationId: r.location_id as string,
        locationName: Array.isArray(loc) ? (loc[0]?.name ?? '—') : (loc?.name ?? '—'),
        cut: (r.specs_cut as number) ?? 0,
        notCut: (r.specs_not_cut as number) ?? 0,
      };
    },
  );

  const agg = computeVision(rows);
  return { from: fromDay, to: toDay, mobiles: agg.mobiles, totals: agg.totals };
}

export async function upsertVisionEntry(
  locationId: string,
  date: string,
  cut: number,
  notCut: number,
): Promise<void> {
  const ctx = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('vision_entries').upsert(
    {
      organization_id: ctx.organizationId,
      location_id: locationId,
      entry_date: date,
      specs_cut: cut,
      specs_not_cut: notCut,
      submitted_by: ctx.userId,
    },
    { onConflict: 'location_id,entry_date' },
  );
  if (error) throw new Error(error.message);
}
