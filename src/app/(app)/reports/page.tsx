import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { getReportBack } from '@/services/reports/service';
import { addDays } from '@/domain/kpi/date-range';
import { type DailyReportView } from '@/lib/reports';

const dash = (v: string | number | null) =>
  v === null || v === '' ? '—' : String(v);

function duration(mins: number | null) {
  if (mins === null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function Field({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source?: string;
}) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">
        {label}
        {source && (
          <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wide">
            {source}
          </span>
        )}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function MobileReport({ r }: { r: DailyReportView }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{r.locationName}</span>
        <div className="flex items-center gap-2">
          {!r.hasReport && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
              No report
            </span>
          )}
          <Link
            href={`/reports/${r.locationId}?date=${r.date}`}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
          >
            <Pencil className="h-3 w-3" /> {r.hasReport ? 'Edit' : 'Enter'}
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Field label="Start of services" value={dash(r.startOfServices)} />
        <Field label="End of services" value={dash(r.endOfServices)} />
        <Field label="Service time" value={duration(r.serviceMinutes)} />
        <Field label="1st patient enrolled" value={dash(r.firstEnrolledAt)} />
        <Field label="1st through PHC" value={dash(r.firstPhcAt)} />
        <Field
          label="Avg PHC consult"
          value={r.avgPhcMinutes === null ? '—' : `${r.avgPhcMinutes}m`}
          source="Goodx"
        />
        <Field label="Specs dispensed" value={dash(r.specsDispensed)} source="iTrust" />
        <Field label="Not dispensed (no stock)" value={dash(r.specsNoStock)} />
        <Field label="Cumulative backlog" value={String(r.cumulativeBacklog)} />
      </div>
      {r.notes && (
        <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
          {r.notes}
        </p>
      )}
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const { date, mobiles } = await getReportBack(sp.date);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily report</h1>
          <p className="text-sm text-muted-foreground">Report-back by mobile</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/reports?date=${addDays(date, -1)}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[7rem] text-center text-sm font-medium">{date}</span>
          <Link
            href={`/reports?date=${addDays(date, 1)}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {sp.saved && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          Report saved.
        </div>
      )}

      {mobiles.length === 0 && (
        <p className="text-sm text-muted-foreground">No mobiles in scope.</p>
      )}

      <div className="space-y-2">
        {mobiles.map((r) => (
          <MobileReport key={r.locationId} r={r} />
        ))}
      </div>
    </div>
  );
}
