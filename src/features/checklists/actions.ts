'use server';

import { redirect } from 'next/navigation';
import {
  ensureInstance,
  submitChecklist,
} from '@/services/checklists/service';
import { type ResponseValue } from '@/lib/checklists';

/** From the list: find-or-create today's instance and open it. */
export async function openChecklist(formData: FormData) {
  const templateId = String(formData.get('templateId'));
  const locationId = String(formData.get('locationId'));
  const id = await ensureInstance(templateId, locationId);
  redirect(`/checklists/${id}`);
}

/** From the fill-in form: save + evaluate flags + raise tickets. */
export async function submitChecklistAction(
  instanceId: string,
  values: Record<string, ResponseValue>,
) {
  return submitChecklist(instanceId, values);
}
