import { requireManagement } from '@/services/auth/session';
import { listTickets, type TicketRow } from '@/services/tickets/service';
import { listAccessibleMobiles } from '@/services/locations/service';
import { nextStatuses } from '@/domain/tickets/status';
import {
  TICKET_SOURCE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  type TicketStatus,
} from '@/lib/tickets';
import {
  createTicketAction,
  pushTicketAction,
  setStatusAction,
} from '@/features/tickets/actions';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-destructive/15 text-destructive',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  closed: 'bg-muted text-muted-foreground',
};

const TRANSITION_LABELS: Record<TicketStatus, string> = {
  open: 'Reopen',
  in_progress: 'Start',
  closed: 'Close',
};

function Banner({ sp }: { sp: Record<string, string | undefined> }) {
  const map: Record<string, string> = {
    created: 'Ticket created.',
    updated: 'Ticket updated.',
    pushed: 'Pushed to the Guud ticket system.',
  };
  if (sp.created || sp.updated || sp.pushed) {
    const key = sp.created ? 'created' : sp.updated ? 'updated' : 'pushed';
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
        {map[key]}
      </div>
    );
  }
  if (sp.push === 'not_configured') {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        Push isn&apos;t connected yet — add your ticket-system API details to
        enable it.
      </div>
    );
  }
  if (sp.push === 'error') {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        Push failed — check the ticket-system connection.
      </div>
    );
  }
  return null;
}

function TicketCard({ t }: { t: TicketRow }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{t.title}</div>
          {t.description && (
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {t.description}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {t.locationName && <span>{t.locationName}</span>}
            <span className="rounded-full bg-muted px-2 py-0.5">
              {TICKET_SOURCE_LABELS[t.source]}
            </span>
            {t.externalId && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                Pushed
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_STYLES[t.status],
          )}
        >
          {TICKET_STATUS_LABELS[t.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {nextStatuses(t.status).map((s) => (
          <form key={s} action={setStatusAction}>
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="status" value={s} />
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
            >
              {TRANSITION_LABELS[s]}
            </button>
          </form>
        ))}
        {!t.externalId && (
          <form action={pushTicketAction}>
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            >
              Push
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireManagement();
  const [tickets, mobiles, sp] = await Promise.all([
    listTickets(),
    listAccessibleMobiles(),
    searchParams,
  ]);

  const byStatus = (s: TicketStatus) => tickets.filter((t) => t.status === s);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">
          Issues across your mobiles
        </p>
      </div>

      <Banner sp={sp} />

      {/* New ticket — native <details>, no client JS */}
      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
          + New ticket
        </summary>
        <form action={createTicketAction} className="space-y-2 border-t border-border p-3">
          <input
            name="title"
            required
            placeholder="What's the issue?"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Details (optional)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            name="locationId"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="">No specific mobile</option>
            {mobiles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Create ticket
          </button>
        </form>
      </details>

      {tickets.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No tickets yet. Flagged checklist items land here automatically.
        </p>
      )}

      {TICKET_STATUS_ORDER.map((s) => {
        const list = byStatus(s);
        if (list.length === 0) return null;
        return (
          <section key={s} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {TICKET_STATUS_LABELS[s]} · {list.length}
            </h2>
            <div className="space-y-2">
              {list.map((t) => (
                <TicketCard key={t.id} t={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
