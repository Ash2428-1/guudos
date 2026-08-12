import { describe, expect, it } from 'vitest';
import { computeVision, cutRate } from '@/domain/vision/calc';

describe('cutRate', () => {
  it('is cut / total as a percent', () => {
    expect(cutRate(8, 2)).toBe(80);
  });
  it('is 0 when nothing recorded', () => {
    expect(cutRate(0, 0)).toBe(0);
  });
});

describe('computeVision', () => {
  const rows = [
    { locationId: 'm1', locationName: 'Mobile 01', cut: 5, notCut: 1 },
    { locationId: 'm1', locationName: 'Mobile 01', cut: 3, notCut: 1 },
    { locationId: 'm2', locationName: 'Mobile 02', cut: 2, notCut: 8 },
  ];

  it('aggregates per mobile with cut-rate', () => {
    const { mobiles } = computeVision(rows);
    const m1 = mobiles.find((m) => m.locationId === 'm1')!;
    const m2 = mobiles.find((m) => m.locationId === 'm2')!;
    expect(m1.cut).toBe(8);
    expect(m1.notCut).toBe(2);
    expect(m1.cutRate).toBe(80);
    expect(m2.cutRate).toBe(20);
  });

  it('computes org totals and overall cut-rate', () => {
    const { totals } = computeVision(rows);
    expect(totals.cut).toBe(10);
    expect(totals.notCut).toBe(10);
    expect(totals.cutRate).toBe(50);
  });

  it('returns empty for no rows', () => {
    expect(computeVision([]).mobiles).toEqual([]);
    expect(computeVision([]).totals.cutRate).toBe(0);
  });
});
