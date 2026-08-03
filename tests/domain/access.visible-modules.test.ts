import { describe, expect, it } from 'vitest';
import { canSeeModule, visibleModules } from '@/domain/access/visible-modules';
import { type NavModule } from '@/lib/navigation';
import { Home } from 'lucide-react';

const mod = (over: Partial<NavModule>): NavModule => ({
  key: 'x',
  label: 'X',
  href: '/x',
  icon: Home,
  enabled: true,
  description: '',
  ...over,
});

describe('canSeeModule', () => {
  it('hides modules below the viewer role', () => {
    const viewer = { role: 'staff' as const, capabilities: new Set<never>() };
    expect(canSeeModule(viewer, mod({ minRole: 'supervisor' }))).toBe(false);
    expect(canSeeModule(viewer, mod({}))).toBe(true);
  });

  it('hides capability-gated modules the viewer lacks', () => {
    const viewer = { role: 'manager' as const, capabilities: new Set(['view_labour' as const]) };
    expect(canSeeModule(viewer, mod({ capability: 'view_labour' }))).toBe(true);
    expect(canSeeModule(viewer, mod({ capability: 'view_stock' }))).toBe(false);
  });
});

describe('visibleModules', () => {
  it('preserves registry order and filters', () => {
    const viewer = { role: 'staff' as const, capabilities: new Set<never>() };
    const list = [mod({ key: 'a' }), mod({ key: 'b', minRole: 'owner' }), mod({ key: 'c' })];
    expect(visibleModules(viewer, list).map((m) => m.key)).toEqual(['a', 'c']);
  });
});
