import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireManager } from '@/services/auth/session';
import { listWorkOrders } from '@/services/work-orders/service';

export default async function WorkOrdersPage() {
  await requireManager();
  const orders = await listWorkOrders();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work orders</h1>
          <p className="text-sm text-muted-foreground">Client engagements → movement orders</p>
        </div>
        <Link
          href="/work-orders/new"
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New
        </Link>
      </div>

      {orders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No work orders yet. Tap <span className="font-medium">New</span> to create one — you can
          upload a photo/PDF of a client work order and it auto-fills.
        </p>
      )}

      <div className="space-y-2">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/work-orders/${o.id}`}
            className="block rounded-lg border border-border bg-card p-3 hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.clientName ?? 'Untitled work order'}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {o.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {[o.assessmentDates, o.mobilesRequired ? `${o.mobilesRequired} mobiles` : null]
                .filter(Boolean)
                .join(' · ') || '—'}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
