import { describe, expect, it } from 'vitest';
import {
  can,
  canMutate,
  effectiveCapabilities,
  hasRoleAtLeast,
  isManagement,
} from '@/domain/access/capabilities';

describe('effectiveCapabilities', () => {
  it('gives Central Leads (owner) every capability', () => {
    const caps = effectiveCapabilities({ role: 'owner' });
    expect(caps.has('view_labour')).toBe(true);
    expect(caps.has('view_vision')).toBe(true);
    expect(caps.has('view_hr')).toBe(true);
  });

  it('gives Regional Managers the regional toolkit but not raw HR', () => {
    const caps = effectiveCapabilities({ role: 'manager' });
    expect(caps.has('view_labour')).toBe(true);
    expect(caps.has('view_vision')).toBe(true);
    expect(caps.has('view_hr')).toBe(false);
  });

  it('layers explicit overrides on top of role defaults', () => {
    const caps = effectiveCapabilities({
      role: 'supervisor',
      capabilityOverrides: ['view_labour'],
    });
    expect(caps.has('manage_checklists')).toBe(true); // default
    expect(caps.has('view_labour')).toBe(true); // override
  });

  it('gives staff no management capabilities by default', () => {
    expect(effectiveCapabilities({ role: 'staff' }).size).toBe(0);
  });
});

describe('can / canMutate', () => {
  it('read-only guests can view but never mutate', () => {
    const ctx = { role: 'manager' as const, isReadOnly: true };
    expect(can(ctx, 'view_labour')).toBe(true);
    expect(canMutate(ctx, 'view_labour')).toBe(false);
  });

  it('non-guests with the capability may mutate', () => {
    const ctx = { role: 'manager' as const };
    expect(canMutate(ctx, 'manage_checklists')).toBe(true);
  });
});

describe('role hierarchy', () => {
  it('ranks owner above manager above supervisor above staff', () => {
    expect(hasRoleAtLeast('owner', 'manager')).toBe(true);
    expect(hasRoleAtLeast('manager', 'owner')).toBe(false);
    expect(hasRoleAtLeast('supervisor', 'supervisor')).toBe(true);
  });

  it('treats supervisor (MUM) and up as management', () => {
    expect(isManagement('supervisor')).toBe(true);
    expect(isManagement('staff')).toBe(false);
  });
});
