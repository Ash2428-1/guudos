import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireManager } from '@/services/auth/session';
import { WorkOrderForm } from '@/features/work-orders/work-order-form';
import { EMPTY_WORK_ORDER } from '@/lib/work-orders';

export default async function NewWorkOrderPage() {
  await requireManager();
  return (
    <div className="space-y-4">
      <Link
        href="/work-orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Work orders
      </Link>
      <h1 className="text-xl font-bold tracking-tight">New work order</h1>
      <WorkOrderForm id={null} initial={EMPTY_WORK_ORDER} />
    </div>
  );
}
