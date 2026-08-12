import { type VisionMobile } from '@/lib/vision';

export function cutRate(cut: number, notCut: number): number {
  const total = cut + notCut;
  return total === 0 ? 0 : Math.round((cut / total) * 100);
}

export interface VisionRow {
  locationId: string;
  locationName: string;
  cut: number;
  notCut: number;
}

export interface VisionAggregate {
  mobiles: VisionMobile[];
  totals: { cut: number; notCut: number; cutRate: number };
}

/** Aggregate per-entry rows into per-mobile totals + org totals with cut-rate. */
export function computeVision(rows: VisionRow[]): VisionAggregate {
  const byLoc = new Map<string, VisionMobile>();
  for (const r of rows) {
    const m = byLoc.get(r.locationId) ?? {
      locationId: r.locationId,
      locationName: r.locationName,
      cut: 0,
      notCut: 0,
      cutRate: 0,
    };
    m.cut += r.cut || 0;
    m.notCut += r.notCut || 0;
    byLoc.set(r.locationId, m);
  }

  const mobiles = [...byLoc.values()].map((m) => ({
    ...m,
    cutRate: cutRate(m.cut, m.notCut),
  }));
  mobiles.sort((a, b) => b.cut + b.notCut - (a.cut + a.notCut));

  const cut = mobiles.reduce((s, m) => s + m.cut, 0);
  const notCut = mobiles.reduce((s, m) => s + m.notCut, 0);

  return { mobiles, totals: { cut, notCut, cutRate: cutRate(cut, notCut) } };
}
