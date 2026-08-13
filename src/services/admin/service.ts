import 'server-only';
import { requireOwner } from '@/services/auth/session';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import { createSupabaseAdminClient } from '@/infrastructure/supabase/admin';
import { type JobFunction, type Role } from '@/lib/roles';

export interface RegionRow {
  id: string;
  name: string;
}
export interface MobileRow {
  id: string;
  name: string;
  code: string | null;
  regionName: string | null;
}
export interface PersonRow {
  profileId: string;
  fullName: string | null;
  email: string | null;
  role: Role;
  jobFunction: JobFunction | null;
  mobiles: string[];
}

// --- Regions -------------------------------------------------------------
export async function listRegions(): Promise<RegionRow[]> {
  const ctx = await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('regions')
    .select('id, name')
    .eq('organization_id', ctx.organizationId)
    .order('name');
  return (data ?? []) as RegionRow[];
}

export async function createRegion(name: string): Promise<void> {
  const ctx = await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('regions')
    .insert({ organization_id: ctx.organizationId, name });
  if (error) throw new Error(error.message);
}

// --- Mobiles -------------------------------------------------------------
export async function listMobiles(): Promise<MobileRow[]> {
  const ctx = await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('locations')
    .select('id, name, code, regions(name)')
    .eq('organization_id', ctx.organizationId)
    .order('name');
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const region = r.regions as { name: string } | { name: string }[] | null;
    return {
      id: r.id as string,
      name: r.name as string,
      code: (r.code as string | null) ?? null,
      regionName: Array.isArray(region) ? (region[0]?.name ?? null) : (region?.name ?? null),
    };
  });
}

export async function createMobile(input: {
  name: string;
  code?: string;
  regionId: string;
}): Promise<void> {
  const ctx = await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('locations').insert({
    organization_id: ctx.organizationId,
    region_id: input.regionId,
    name: input.name,
    code: input.code || null,
  });
  if (error) throw new Error(error.message);
}

// --- People --------------------------------------------------------------
export async function listPeople(): Promise<PersonRow[]> {
  const ctx = await requireOwner();
  const supabase = await createSupabaseServerClient();

  const [{ data: mems }, { data: locmems }] = await Promise.all([
    supabase
      .from('memberships')
      .select('profile_id, role, profiles(full_name, email, job_function)')
      .eq('organization_id', ctx.organizationId),
    supabase.from('location_memberships').select('profile_id, locations(name)'),
  ]);

  const mobilesByProfile = new Map<string, string[]>();
  for (const lm of (locmems ?? []) as Array<Record<string, unknown>>) {
    const loc = lm.locations as { name: string } | { name: string }[] | null;
    const name = Array.isArray(loc) ? loc[0]?.name : loc?.name;
    if (!name) continue;
    const pid = lm.profile_id as string;
    mobilesByProfile.set(pid, [...(mobilesByProfile.get(pid) ?? []), name]);
  }

  return ((mems ?? []) as Array<Record<string, unknown>>).map((m) => {
    const p = m.profiles as
      | { full_name: string | null; email: string | null; job_function: JobFunction | null }
      | Array<{ full_name: string | null; email: string | null; job_function: JobFunction | null }>
      | null;
    const profile = Array.isArray(p) ? p[0] : p;
    const pid = m.profile_id as string;
    return {
      profileId: pid,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      role: m.role as Role,
      jobFunction: profile?.job_function ?? null,
      mobiles: mobilesByProfile.get(pid) ?? [],
    };
  });
}

/**
 * Add a person: create (or find) their auth user, then set their profile,
 * org membership and mobile assignments. Uses the service-role client — the
 * action MUST be owner-guarded before calling.
 */
export async function invitePerson(input: {
  email: string;
  fullName: string;
  role: Role;
  jobFunction: JobFunction | null;
  regionId: string | null;
  mobileIds: string[];
  /** Optional initial password — owner sets it and hands it to the person. */
  password?: string;
}): Promise<{ userId: string; created: boolean }> {
  const ctx = await requireOwner();
  const admin = createSupabaseAdminClient();

  // Find existing auth user or create one (email pre-confirmed → magic-link login).
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find(
    (u) => u.email?.toLowerCase() === input.email.toLowerCase(),
  );
  let created = false;
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'Create user failed');
    user = data.user;
    created = true;
  }

  // Optional initial password (new or existing user) — lets people log in with
  // email + password immediately, no reset email required.
  if (input.password) {
    await admin.auth.admin.updateUserById(user.id, { password: input.password });
  }

  await admin.from('profiles').upsert(
    {
      id: user.id,
      full_name: input.fullName,
      email: input.email,
      job_function: input.jobFunction,
    },
    { onConflict: 'id' },
  );

  await admin.from('memberships').upsert(
    {
      profile_id: user.id,
      organization_id: ctx.organizationId,
      role: input.role,
      region_id: input.regionId,
    },
    { onConflict: 'profile_id,organization_id' },
  );

  if (input.mobileIds.length) {
    await admin.from('location_memberships').upsert(
      input.mobileIds.map((location_id) => ({ profile_id: user!.id, location_id })),
      { onConflict: 'profile_id,location_id' },
    );
  }

  return { userId: user.id, created };
}

// --- Crew roster ---------------------------------------------------------
export interface CrewMember {
  role: string;
  name: string;
}

/** Crew grouped by mobile (location_id → members). */
export async function listCrewByMobile(): Promise<Record<string, CrewMember[]>> {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('mobile_crew')
    .select('location_id, role, name')
    .order('role');
  const map: Record<string, CrewMember[]> = {};
  for (const r of (data ?? []) as Array<{
    location_id: string;
    role: string;
    name: string;
  }>) {
    (map[r.location_id] ??= []).push({ role: r.role, name: r.name });
  }
  return map;
}
