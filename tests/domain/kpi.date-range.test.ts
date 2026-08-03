import { describe, expect, it } from 'vitest';
import {
  addDays,
  countDays,
  listDays,
  rangeFor,
  toISODate,
} from '@/domain/kpi/date-range';

describe('date arithmetic', () => {
  it('adds and subtracts days across month boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('rangeFor', () => {
  it('day → single day', () => {
    expect(rangeFor('day', '2026-08-03')).toEqual({
      start: '2026-08-03',
      end: '2026-08-03',
    });
  });

  it('week → Monday..Sunday containing the anchor', () => {
    // 2026-08-03 is a Monday
    expect(rangeFor('week', '2026-08-05')).toEqual({
      start: '2026-08-03',
      end: '2026-08-09',
    });
  });

  it('month → first..last of month', () => {
    expect(rangeFor('month', '2026-02-15')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });
});

describe('listDays / countDays', () => {
  it('enumerates inclusive days', () => {
    const r = { start: '2026-08-03', end: '2026-08-05' };
    expect(listDays(r)).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
    expect(countDays(r)).toBe(3);
  });
});

describe('toISODate', () => {
  it('formats a UTC epoch to YYYY-MM-DD', () => {
    expect(toISODate(Date.UTC(2026, 7, 3))).toBe('2026-08-03');
  });
});
