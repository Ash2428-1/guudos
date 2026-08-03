import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getInstanceDetail } from '@/services/checklists/service';
import { ChecklistForm } from '@/features/checklists/checklist-form';

export default async function ChecklistInstancePage({
  params,
}: {
  params: Promise<{ instanceId: string }>;
}) {
  const { instanceId } = await params;
  const detail = await getInstanceDetail(instanceId);
  if (!detail) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/checklists"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Checklists
      </Link>
      <h1 className="text-xl font-bold tracking-tight">{detail.templateName}</h1>
      <ChecklistForm
        instanceId={detail.instanceId}
        items={detail.items}
        initialResponses={detail.responses}
      />
    </div>
  );
}
