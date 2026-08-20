import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireManager } from '@/services/auth/session';
import { getWorkOrder } from '@/services/work-orders/service';
import { WorkOrderForm } from '@/features/work-orders/work-order-form';
import { createMovementFromWorkOrderAction } from '@/features/movement-orders/actions';

export default async function EditWorkOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireManager();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const wo = await getWorkOrder(id);
  if (!wo) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/work-orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Work orders
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          {wo.clientName ?? 'Work order'}
        </h1>
        <form action={createMovementFromWorkOrderAction}>
          <input type="hidden" name="workOrderId" value={wo.id} />
          <button
            type="submit"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Create movement order →
          </button>
        </form>
      </div>
      {sp.saved && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          Work order saved.
        </div>
      )}
      <WorkOrderForm id={wo.id} initial={wo} />
    </div>
  );
}
