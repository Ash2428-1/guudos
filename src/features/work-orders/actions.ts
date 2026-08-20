'use server';

import { requireManager } from '@/services/auth/session';
import { createWorkOrder, updateWorkOrder } from '@/services/work-orders/service';
import { extractWorkOrder, type ExtractResult } from '@/services/work-orders/extract';
import { type WorkOrderFields } from '@/lib/work-orders';

/** Extract Work Order fields from an uploaded photo/PDF (base64). */
export async function extractWorkOrderAction(
  base64: string,
  mediaType: string,
): Promise<ExtractResult> {
  await requireManager();
  return extractWorkOrder(base64, mediaType);
}

/** Create (id=null) or update a Work Order; returns its id. */
export async function saveWorkOrderAction(
  id: string | null,
  fields: WorkOrderFields,
): Promise<string> {
  await requireManager();
  if (id) {
    await updateWorkOrder(id, fields);
    return id;
  }
  return createWorkOrder(fields);
}
