import { describe, expect, it } from 'vitest';
import { cumulativeBacklog, serviceDurationMinutes } from '@/domain/reports/calc';

describe('serviceDurationMinutes', () => {
  it('computes end − start in minutes', () => {
    expect(serviceDurationMinutes('08:00', '16:30')).toBe(510);
  });
  it('returns null if a time is missing', () => {
    expect(serviceDurationMinutes(null, '16:30')).toBeNull();
    expect(serviceDurationMinutes('08:00', null)).toBeNull();
  });
  it('returns 0 if end is not after start', () => {
    expect(serviceDurationMinutes('16:00', '08:00')).toBe(0);
  });
});

describe('cumulativeBacklog', () => {
  const daily = [
    { date: '2026-08-01', noStock: 3 },
    { date: '2026-08-02', noStock: 2 },
    { date: '2026-08-03', noStock: 4 },
  ];
  it('sums no-stock counts up to and including the date', () => {
    expect(cumulativeBacklog(daily, '2026-08-02')).toBe(5);
    expect(cumulativeBacklog(daily, '2026-08-03')).toBe(9);
  });
  it('is 0 before any reports', () => {
    expect(cumulativeBacklog(daily, '2026-07-31')).toBe(0);
  });
});
