/** Pure labour math. No dates/timezones here — the service resolves those to
 *  plain numbers (ms epochs, minutes-since-midnight) before calling in. */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Hours between two epoch-ms instants (0 if out precedes in). */
export function hoursBetween(inMs: number, outMs: number): number {
  if (outMs <= inMs) return 0;
  return round2((outMs - inMs) / 3_600_000);
}

/** Minutes late = actual start minus expected (never negative). */
export function lateness(actualMinutes: number, expectedMinutes: number): number {
  return Math.max(0, Math.round(actualMinutes - expectedMinutes));
}

/** Labour cost for a stretch of hours at an hourly rate (× optional multiplier). */
export function cost(hours: number, rate: number, multiplier = 1): number {
  return round2(hours * rate * multiplier);
}

export interface LabourLine {
  hours: number;
  lateMinutes: number;
  cost: number;
}

export interface LabourTotals {
  hours: number;
  cost: number;
  lateCount: number; // lines with any lateness
  lateMinutes: number;
}

export function summarize(lines: LabourLine[]): LabourTotals {
  return lines.reduce<LabourTotals>(
    (t, l) => ({
      hours: round2(t.hours + l.hours),
      cost: round2(t.cost + l.cost),
      lateCount: t.lateCount + (l.lateMinutes > 0 ? 1 : 0),
      lateMinutes: t.lateMinutes + l.lateMinutes,
    }),
    { hours: 0, cost: 0, lateCount: 0, lateMinutes: 0 },
  );
}
