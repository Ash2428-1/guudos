import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getDailyReport, localDay } from '@/services/reports/service';
import { listAccessibleMobiles } from '@/services/locations/service';
import { saveDailyReportAction } from '@/features/reports/actions';

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

function TimeField({ label, name, value }: { label: string; name: string; value: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input type="time" name={name} defaultValue={value ?? ''} className={inputCls} />
    </label>
  );
}

function NumField({
  label,
  name,
  value,
  source,
}: {
  label: string;
  name: string;
  value: number | null;
  source?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">
        {label}
        {source && (
          <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px] uppercase">
            {source} · auto later
          </span>
        )}
      </span>
      <input
        type="number"
        inputMode="numeric"
        name={name}
        defaultValue={value ?? ''}
        className={inputCls}
      />
    </label>
  );
}

export default async function DailyReportFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ locationId }, sp] = await Promise.all([params, searchParams]);
  const date = sp.date ?? localDay(-1);

  const mobiles = await listAccessibleMobiles();
  const mobile = mobiles.find((m) => m.id === locationId);
  if (!mobile) notFound();

  const r = await getDailyReport(locationId, date);

  return (
    <div className="space-y-4">
      <Link
        href={`/reports?date=${date}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Report-back
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">{mobile.name}</h1>
        <p className="text-sm text-muted-foreground">Daily report</p>
      </div>

      <form action={saveDailyReportAction} className="space-y-3">
        <input type="hidden" name="locationId" value={locationId} />
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Service date</span>
          <input type="date" name="date" defaultValue={date} className={inputCls} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Start of services" name="startOfServices" value={r.startOfServices} />
          <TimeField label="End of services" name="endOfServices" value={r.endOfServices} />
          <TimeField label="1st patient enrolled" name="firstEnrolledAt" value={r.firstEnrolledAt} />
          <TimeField label="1st through PHC" name="firstPhcAt" value={r.firstPhcAt} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Avg PHC consult (min)" name="avgPhcMinutes" value={r.avgPhcMinutes} source="Goodx" />
          <NumField label="Specs dispensed" name="specsDispensed" value={r.specsDispensed} source="iTrust" />
          <NumField label="Not dispensed (no stock)" name="specsNoStock" value={r.specsNoStock} />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Notes</span>
          <textarea name="notes" rows={2} defaultValue={r.notes ?? ''} className={inputCls} />
        </label>

        <div className="sticky bottom-20 z-20 md:bottom-4">
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            Save report
          </button>
        </div>
      </form>
    </div>
  );
}
