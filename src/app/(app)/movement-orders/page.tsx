import Link from 'next/link';
import { requireSession } from '@/services/auth/session';
import { listMovementOrders } from '@/services/movement-orders/service';

export default async function MovementOrdersPage() {
  await requireSession();
  const orders = await listMovementOrders();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movement orders</h1>
        <p className="text-sm text-muted-foreground">Deployment plans</p>
      </div>

      {orders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          None yet — create one from a work order (Work orders → open one → Create movement order).
        </p>
      )}

      <div className="space-y-2">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/movement-orders/${o.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent"
          >
            <div>
              <div className="font-medium">{o.projectName ?? 'Untitled movement order'}</div>
              <div className="text-xs text-muted-foreground">{o.startDate ?? '—'}</div>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{o.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
