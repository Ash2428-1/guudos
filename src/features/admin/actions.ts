'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createMobile,
  createRegion,
  invitePerson,
} from '@/services/admin/service';
import {
  JOB_FUNCTIONS,
  ROLES,
  type JobFunction,
  type Role,
} from '@/lib/roles';

export async function createRegionAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect('/admin?err=1');
  await createRegion(name);
  revalidatePath('/admin');
  redirect('/admin?created=region');
}

export async function createMobileAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const regionId = String(formData.get('regionId') ?? '');
  if (!name || !regionId) redirect('/admin?err=1');
  const code = String(formData.get('code') ?? '').trim() || undefined;
  await createMobile({ name, code, regionId });
  revalidatePath('/admin');
  redirect('/admin?created=mobile');
}

export async function invitePersonAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const role = String(formData.get('role') ?? '') as Role;
  const jobRaw = String(formData.get('jobFunction') ?? '');
  const regionId = String(formData.get('regionId') ?? '') || null;
  const mobileIds = formData.getAll('mobileIds').map(String).filter(Boolean);
  const password = String(formData.get('password') ?? '').trim() || undefined;

  if (!email || !fullName) redirect('/admin?err=1');
  if (!(ROLES as readonly string[]).includes(role)) redirect('/admin?err=1');
  if (password && password.length < 8) redirect('/admin?err=pw');
  const jobFunction = (JOB_FUNCTIONS as readonly string[]).includes(jobRaw)
    ? (jobRaw as JobFunction)
    : null;

  const res = await invitePerson({
    email,
    fullName,
    role,
    jobFunction,
    regionId,
    mobileIds,
    password,
  });
  revalidatePath('/admin');
  redirect(`/admin?invited=${res.created ? 'new' : 'existing'}`);
}
