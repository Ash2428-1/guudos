import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getRegionalOverview } from '@/services/dashboard/service';
import { addDays } from '@/domain/kpi/date-range';
import { cn } from '@/lib/utils';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const o = await getRegionalOverview(date);
  const prev = addDays(o.date, -1);
  const next = addDays(o.date, 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Across your mobiles</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/overview?date=${prev}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[7rem] text-center text-sm font-medium">{o.date}</span>
          <Link
            href={`/overview?date=${next}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Checklist completion"
          value={`${o.totals.completionPct}%`}
          hint={`${o.totals.checklistsCompleted}/${o.totals.checklistsDue} done`}
        />
        <Stat label="Mobiles" value={String(o.totals.mobiles)} />
        <Stat label="Open tickets" value={String(o.totals.openTickets)} />
        <Stat label="Opened today" value={String(o.totals.ticketsOpenedToday)} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">By mobile</h2>
        {o.mobiles.length === 0 && (
          <p className="text-sm text-muted-foreground">No mobiles in scope.</p>
        )}
        <div className="space-y-2">
          {o.mobiles.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{m.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {m.checklistsCompleted}/{m.checklistsDue} checks
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-medium',
                      m.openTickets > 0
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {m.openTickets} open
                  </span>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full',
                    m.completionPct === 100 ? 'bg-primary' : 'bg-amber-500',
                  )}
                  style={{ width: `${m.completionPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
