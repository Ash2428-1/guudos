/** Pure daily-report math. */

/** Minutes of service (end − start); 0 if either missing or end ≤ start. */
export function serviceDurationMinutes(
  start: string | null,
  end: string | null,
): number | null {
  if (!start || !end) return null;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const d = toMin(end) - toMin(start);
  return d > 0 ? d : 0;
}

/**
 * Cumulative "no stock" backlog for a mobile up to and including `upToDate`.
 * Each entry is one day's specs-not-dispensed-due-to-no-stock count.
 */
export function cumulativeBacklog(
  daily: Array<{ date: string; noStock: number }>,
  upToDate: string,
): number {
  return daily
    .filter((d) => d.date <= upToDate)
    .reduce((sum, d) => sum + (d.noStock || 0), 0);
}
