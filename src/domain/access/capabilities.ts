/**
 * Pure access-control logic. No I/O, no framework — unit-tested in isolation.
 *
 * Row-level scoping (which org / region / mobile a user can touch) is enforced
 * by Postgres RLS. This module answers the orthogonal question: given a
 * resolved role + explicit capability grants, WHAT can this person do?
 */
import {
  type Capability,
  type Role,
  CAPABILITIES,
  ROLE_RANK,
} from '@/lib/roles';

/** Capabilities every role of a given rank gets for free. */
const ROLE_DEFAULT_CAPABILITIES: Record<Role, readonly Capability[]> = {
  // Central Leads see everything.
  owner: CAPABILITIES,
  // Regional Managers get the full regional toolkit but not raw HR by default.
  manager: [
    'view_labour',
    'view_vision',
    'view_stock',
    'view_assessments',
    'manage_checklists',
  ],
  // MUMs run their mobile: checklists, nothing sensitive.
  supervisor: ['manage_checklists'],
  // Professionals / Operators: no management capabilities by default.
  staff: [],
};

export interface AccessContext {
  role: Role;
  /** Explicit per-person grants layered on top of role defaults. */
  capabilityOverrides?: readonly Capability[];
  /** Read-only guest: may view what their role allows, but never mutate. */
  isReadOnly?: boolean;
}

/** The full set of capabilities a person effectively holds. */
export function effectiveCapabilities(ctx: AccessContext): Set<Capability> {
  return new Set<Capability>([
    ...ROLE_DEFAULT_CAPABILITIES[ctx.role],
    ...(ctx.capabilityOverrides ?? []),
  ]);
}

/** Can this person use `capability` at all (view-level)? */
export function can(ctx: AccessContext, capability: Capability): boolean {
  return effectiveCapabilities(ctx).has(capability);
}

/** Can this person perform a *mutating* action gated by `capability`? */
export function canMutate(ctx: AccessContext, capability: Capability): boolean {
  return !ctx.isReadOnly && can(ctx, capability);
}

/** Is this role at least as privileged as `minimum`? (hierarchy check) */
export function hasRoleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Management = supervisor and up. Mirrors requireManagement() on the server. */
export function isManagement(role: Role): boolean {
  return hasRoleAtLeast(role, 'supervisor');
}
