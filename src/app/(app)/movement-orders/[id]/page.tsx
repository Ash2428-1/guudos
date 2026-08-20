import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireManager } from '@/services/auth/session';
import { getMovementOrder } from '@/services/movement-orders/service';
import { listAccessibleMobiles } from '@/services/locations/service';
import { MovementOrderForm } from '@/features/movement-orders/movement-order-form';

export default async function MovementOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireManager();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [mo, mobiles] = await Promise.all([getMovementOrder(id), listAccessibleMobiles()]);
  if (!mo) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/movement-orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Movement orders
      </Link>
      <h1 className="text-xl font-bold tracking-tight">{mo.projectName ?? 'Movement order'}</h1>
      {sp.saved && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
          Movement order saved.
        </div>
      )}
      <MovementOrderForm
        id={mo.id}
        initial={mo}
        initialLegs={mo.legs}
        mobiles={mobiles.map((m) => ({ id: m.id, name: m.name, code: null }))}
      />
    </div>
  );
}
