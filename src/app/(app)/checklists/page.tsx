import { getTodaysChecklists, type ChecklistRow } from '@/services/checklists/service';
import { openChecklist } from '@/features/checklists/actions';
import { INSTANCE_STATUS_LABELS } from '@/lib/checklists';
import { JOB_FUNCTION_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-primary/15 text-primary',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  pending: 'bg-muted text-muted-foreground',
};

export default async function ChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<{ flagged?: string; done?: string }>;
}) {
  const [rows, sp] = await Promise.all([getTodaysChecklists(), searchParams]);

  // Group by mobile.
  const byMobile = new Map<string, ChecklistRow[]>();
  for (const r of rows) {
    const list = byMobile.get(r.locationName) ?? [];
    list.push(r);
    byMobile.set(r.locationName, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Checklists</h1>
        <p className="text-sm text-muted-foreground">Today&apos;s checks</p>
      </div>

      {sp.flagged && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Submitted — {sp.flagged} item(s) flagged and raised as tickets.
        </div>
      )}
      {sp.done && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          Checklist submitted. Nothing flagged — nice work.
        </div>
      )}

      {byMobile.size === 0 && (
        <p className="text-sm text-muted-foreground">
          No checklists set up yet.
        </p>
      )}

      {[...byMobile.entries()].map(([mobile, list]) => (
        <section key={mobile} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{mobile}</h2>
          <div className="space-y-2">
            {list.map((r) => (
              <form
                key={`${r.templateId}-${r.locationId}`}
                action={openChecklist}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <input type="hidden" name="templateId" value={r.templateId} />
                <input type="hidden" name="locationId" value={r.locationId} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.templateName}</div>
                  {r.targetJob && (
                    <div className="text-xs text-muted-foreground">
                      {JOB_FUNCTION_LABELS[r.targetJob]}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_STYLES[r.status],
                    )}
                  >
                    {INSTANCE_STATUS_LABELS[r.status]}
                  </span>
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  >
                    {r.status === 'pending' ? 'Start' : 'Open'}
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
