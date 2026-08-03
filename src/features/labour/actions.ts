'use server';

import { revalidatePath } from 'next/cache';
import { clockIn, clockOut } from '@/services/labour/service';

export async function clockInAction(formData: FormData) {
  const locationId = String(formData.get('locationId') ?? '');
  if (locationId) await clockIn(locationId);
  revalidatePath('/clock');
}

export async function clockOutAction() {
  await clockOut();
  revalidatePath('/clock');
}
