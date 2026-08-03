'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createTicket,
  pushTicket,
  setTicketStatus,
} from '@/services/tickets/service';
import { isTicketStatus } from '@/domain/tickets/status';

export async function createTicketAction(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) redirect('/tickets?err=title');
  const description = String(formData.get('description') ?? '').trim() || undefined;
  const locationId = String(formData.get('locationId') ?? '') || null;
  await createTicket({ title, description, locationId });
  revalidatePath('/tickets');
  redirect('/tickets?created=1');
}

export async function setStatusAction(formData: FormData) {
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (!isTicketStatus(status)) redirect('/tickets?err=status');
  await setTicketStatus(id, status);
  revalidatePath('/tickets');
  redirect('/tickets?updated=1');
}

export async function pushTicketAction(formData: FormData) {
  const id = String(formData.get('id'));
  const res = await pushTicket(id);
  revalidatePath('/tickets');
  if (res.ok) redirect('/tickets?pushed=1');
  redirect(`/tickets?push=${res.reason === 'not_configured' ? 'not_configured' : 'error'}`);
}
