/**
 * Pure date helpers for KPI dashboards (day nav + date-range aggregation).
 * The currency is an ISO date string 'YYYY-MM-DD' so the logic is timezone-safe
 * and deterministic under test — callers format for display.
 */

export type Period = 'day' | 'week' | 'month';

export interface DateRange {
  /** inclusive start, 'YYYY-MM-DD' */
  start: string;
  /** inclusive end, 'YYYY-MM-DD' */
  end: string;
}

const MS_PER_DAY = 86_400_000;

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function toISODate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  return toISODate(toUTC(iso) + n * MS_PER_DAY);
}

/** Monday-based ISO weekday: Mon=0 … Sun=6. */
function isoWeekday(iso: string): number {
  return (new Date(toUTC(iso)).getUTCDay() + 6) % 7;
}

/** The inclusive range covering `anchor` for the given period. */
export function rangeFor(period: Period, anchor: string): DateRange {
  switch (period) {
    case 'day':
      return { start: anchor, end: anchor };
    case 'week': {
      const start = addDays(anchor, -isoWeekday(anchor));
      return { start, end: addDays(start, 6) };
    }
    case 'month': {
      const [y, m] = anchor.split('-').map(Number);
      const start = toISODate(Date.UTC(y, m - 1, 1));
      const end = toISODate(Date.UTC(y, m, 0)); // day 0 of next month = last day
      return { start, end };
    }
  }
}

/** Every day in an inclusive range. */
export function listDays(range: DateRange): string[] {
  const out: string[] = [];
  for (let ms = toUTC(range.start); ms <= toUTC(range.end); ms += MS_PER_DAY) {
    out.push(toISODate(ms));
  }
  return out;
}

/** Number of days in an inclusive range. */
export function countDays(range: DateRange): number {
  return Math.round((toUTC(range.end) - toUTC(range.start)) / MS_PER_DAY) + 1;
}
