'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { upsertVisionEntry } from '@/services/vision/service';

function num(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export async function saveVisionEntryAction(formData: FormData) {
  const locationId = String(formData.get('locationId') ?? '');
  const date = String(formData.get('date') ?? '');
  if (!locationId || !date) redirect('/vision?err=1');
  await upsertVisionEntry(locationId, date, num(formData.get('cut')), num(formData.get('notCut')));
  revalidatePath('/vision');
  redirect(`/vision?from=${date}&to=${date}&saved=1`);
}
