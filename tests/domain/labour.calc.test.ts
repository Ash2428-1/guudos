import { describe, expect, it } from 'vitest';
import {
  cost,
  hoursBetween,
  lateness,
  summarize,
} from '@/domain/labour/calc';

const at = (h: number, m = 0) => Date.UTC(2026, 7, 3, h, m); // fixed instants

describe('hoursBetween', () => {
  it('computes fractional hours', () => {
    expect(hoursBetween(at(8), at(16, 30))).toBe(8.5);
  });
  it('is 0 when clock-out precedes clock-in', () => {
    expect(hoursBetween(at(16), at(8))).toBe(0);
  });
});

describe('lateness', () => {
  it('counts minutes past expected start', () => {
    expect(lateness(8 * 60 + 12, 8 * 60)).toBe(12);
  });
  it('is 0 when early or on time', () => {
    expect(lateness(7 * 60 + 50, 8 * 60)).toBe(0);
    expect(lateness(8 * 60, 8 * 60)).toBe(0);
  });
});

describe('cost', () => {
  it('multiplies hours × rate', () => {
    expect(cost(8, 45)).toBe(360);
  });
  it('applies a multiplier (e.g. Sunday 1.5×)', () => {
    expect(cost(8, 45, 1.5)).toBe(540);
  });
});

describe('summarize', () => {
  it('totals hours, cost, and lateness', () => {
    const t = summarize([
      { hours: 8, lateMinutes: 12, cost: 360 },
      { hours: 4.5, lateMinutes: 0, cost: 202.5 },
      { hours: 8, lateMinutes: 5, cost: 360 },
    ]);
    expect(t.hours).toBe(20.5);
    expect(t.cost).toBe(922.5);
    expect(t.lateCount).toBe(2);
    expect(t.lateMinutes).toBe(17);
  });
});
