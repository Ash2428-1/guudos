import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/infrastructure/supabase/server';
import {
  can,
  effectiveCapabilities,
  hasRoleAtLeast,
  isManagement,
} from '@/domain/access/capabilities';
import { type Capability, type Role } from '@/lib/roles';

export interface SessionContext {
  userId: string;
  email: string | null;
  fullName: string | null;
  organizationId: string;
  role: Role;
  regionId: string | null;
  capabilities: Set<Capability>;
  isReadOnly: boolean;
}

/**
 * Resolve the current user's session + membership into a single context object.
 * Wrapped in React `cache()` so it runs at most once per request even when
 * called from multiple server components.
 *
 * NOTE: picks the first membership. Multi-org switching lands with the org
 * switcher in the app shell.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: membership } = await supabase
      .from('memberships')
      .select(
        'organization_id, role, region_id, capabilities, is_read_only, profiles(full_name, email)',
      )
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) return null;

    const role = membership.role as Role;
    const profile = Array.isArray(membership.profiles)
      ? membership.profiles[0]
      : membership.profiles;

    return {
      userId: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      organizationId: membership.organization_id,
      role,
      regionId: membership.region_id,
      capabilities: effectiveCapabilities({
        role,
        capabilityOverrides: (membership.capabilities ?? []) as Capability[],
        isReadOnly: membership.is_read_only,
      }),
      isReadOnly: membership.is_read_only,
    };
  },
);

/**
 * Require a signed-in AND provisioned user.
 *  - no auth user        → /login
 *  - signed in, no membership → /welcome (avoids a redirect loop)
 */
export async function requireSession(): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await getSessionContext();
  if (!ctx) redirect('/welcome');
  return ctx;
}

/** Require supervisor (MUM) or above, else bounce to the home tiles. */
export async function requireManagement(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!isManagement(ctx.role)) redirect('/');
  return ctx;
}

/** Require a manager (Regional Manager) or above — the "above-mobile" tier. */
export async function requireManager(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!hasRoleAtLeast(ctx.role, 'manager')) redirect('/');
  return ctx;
}

/** Require an owner (Central Lead), else bounce home. */
export async function requireOwner(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (ctx.role !== 'owner') redirect('/');
  return ctx;
}

/** Require a specific capability, else bounce home. */
export async function requireCapability(
  capability: Capability,
): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!can(ctx, capability)) redirect('/');
  return ctx;
}
