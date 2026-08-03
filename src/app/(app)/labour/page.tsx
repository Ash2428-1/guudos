import { getLabourSummary } from '@/services/labour/service';

const money = (n: number) =>
  `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

export default async function LabourPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const s = await getLabourSummary(from, to);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Labour</h1>
        <p className="text-sm text-muted-foreground">Hours, lateness &amp; cost</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          From
          <input
            type="date"
            name="from"
            defaultValue={s.from}
            className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          To
          <input
            type="date"
            name="to"
            defaultValue={s.to}
            className="mt-1 block rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
          Apply
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Hours" value={String(s.totals.hours)} />
        <Stat label="Labour cost" value={money(s.totals.cost)} />
        <Stat label="Late arrivals" value={String(s.totals.lateCount)} />
        <Stat label="Late minutes" value={String(s.totals.lateMinutes)} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">By person</h2>
        {s.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clock-ins in this range yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 text-right font-medium">Shifts</th>
                  <th className="px-3 py-2 text-right font-medium">Hours</th>
                  <th className="px-3 py-2 text-right font-medium">Late</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.profileId} className="border-t border-border">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right">{r.shifts}</td>
                    <td className="px-3 py-2 text-right">{r.hours}</td>
                    <td className="px-3 py-2 text-right">
                      {r.lateCount > 0 ? `${r.lateCount} (${r.lateMinutes}m)` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.hasRate ? (
                        money(r.cost)
                      ) : (
                        <span className="text-xs text-muted-foreground">no rate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Set hourly rates in the database (pay_rates) to see cost. Cape Town
          time; lateness is vs each mobile&apos;s expected start.
        </p>
      </section>
    </div>
  );
}
