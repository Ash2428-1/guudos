import {
  getMyClockStatus,
  getTodayEntries,
} from '@/services/labour/service';
import { listAccessibleMobiles } from '@/services/locations/service';
import { clockInAction, clockOutAction } from '@/features/labour/actions';

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export default async function ClockPage() {
  const [status, mobiles, today] = await Promise.all([
    getMyClockStatus(),
    listAccessibleMobiles(),
    getTodayEntries(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clock</h1>
        <p className="text-sm text-muted-foreground">Clock in and out of your shift</p>
      </div>

      {status.open ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-center">
          <div className="text-sm text-muted-foreground">On shift at</div>
          <div className="text-lg font-semibold">{status.locationName}</div>
          <div className="text-sm text-muted-foreground">
            since {status.clockInISO ? fmtTime(status.clockInISO) : ''}
          </div>
          <form action={clockOutAction} className="mt-3">
            <button className="w-full rounded-lg bg-destructive px-4 py-3 text-sm font-semibold text-white">
              Clock out
            </button>
          </form>
        </div>
      ) : (
        <form
          action={clockInAction}
          className="space-y-2 rounded-xl border border-border bg-card p-4"
        >
          <label className="text-sm font-medium">Which mobile?</label>
          <select
            name="locationId"
            required
            defaultValue={mobiles.length === 1 ? mobiles[0].id : ''}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {mobiles.length !== 1 && <option value="" disabled>Choose…</option>}
            {mobiles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            Clock in
          </button>
        </form>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Today</h2>
        {today.length === 0 && (
          <p className="text-sm text-muted-foreground">No shifts yet today.</p>
        )}
        {today.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
          >
            <span>{e.locationName}</span>
            <span className="text-muted-foreground">
              {fmtTime(e.clockInISO)} –{' '}
              {e.clockOutISO ? fmtTime(e.clockOutISO) : '…'}
              {e.clockOutISO && (
                <span className="ml-2 font-medium text-foreground">{e.hours}h</span>
              )}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
