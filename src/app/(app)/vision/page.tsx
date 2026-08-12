import { requireCapability } from '@/services/auth/session';
import { getVisionSummary } from '@/services/vision/service';
import { listAccessibleMobiles } from '@/services/locations/service';
import { saveVisionEntryAction } from '@/features/vision/actions';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default async function VisionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; saved?: string }>;
}) {
  await requireCapability('view_vision');
  const sp = await searchParams;
  const [summary, mobiles] = await Promise.all([
    getVisionSummary(sp.from, sp.to),
    listAccessibleMobiles(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vision</h1>
        <p className="text-sm text-muted-foreground">Spectacles cut vs not cut</p>
      </div>

      {/* Date range */}
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          From
          <input type="date" name="from" defaultValue={summary.from} className={inputCls} />
        </label>
        <label className="text-xs text-muted-foreground">
          To
          <input type="date" name="to" defaultValue={summary.to} className={inputCls} />
        </label>
        <button className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
          Apply
        </button>
      </form>

      {sp.saved && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          Vision figures saved.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Cut" value={String(summary.totals.cut)} />
        <Stat label="Not cut" value={String(summary.totals.notCut)} />
        <Stat label="Cut rate" value={`${summary.totals.cutRate}%`} />
      </div>

      {/* Manual entry (until the Guud Vision integration is wired) */}
      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          + Enter / update figures
        </summary>
        <form action={saveVisionEntryAction} className="space-y-2 border-t border-border p-3">
          <select name="locationId" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              Choose mobile…
            </option>
            {mobiles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input type="date" name="date" required defaultValue={summary.to} className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              Cut
              <input type="number" name="cut" min="0" defaultValue="0" className={inputCls} />
            </label>
            <label className="text-xs text-muted-foreground">
              Not cut
              <input type="number" name="notCut" min="0" defaultValue="0" className={inputCls} />
            </label>
          </div>
          <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            Save figures
          </button>
        </form>
      </details>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">By mobile</h2>
        {summary.mobiles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No figures for this range yet.
          </p>
        )}
        <div className="space-y-2">
          {summary.mobiles.map((m) => (
            <div key={m.locationId} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{m.locationName}</span>
                <span className="text-xs text-muted-foreground">
                  {m.cut} cut · {m.notCut} not · {m.cutRate}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', m.cutRate >= 80 ? 'bg-primary' : 'bg-amber-500')}
                  style={{ width: `${m.cutRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
