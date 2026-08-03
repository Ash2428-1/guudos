import { type NavModule } from '@/lib/navigation';
import { type Capability, type Role, ROLE_RANK } from '@/lib/roles';

export interface ModuleViewer {
  role: Role;
  capabilities: Set<Capability>;
}

/** Can this viewer see the given module? (pure — no defaulting side effects) */
export function canSeeModule(viewer: ModuleViewer, mod: NavModule): boolean {
  if (mod.minRole && ROLE_RANK[viewer.role] < ROLE_RANK[mod.minRole]) {
    return false;
  }
  if (mod.capability && !viewer.capabilities.has(mod.capability)) {
    return false;
  }
  return true;
}

/** The modules a viewer may see, in registry order. */
export function visibleModules(
  viewer: ModuleViewer,
  modules: NavModule[],
): NavModule[] {
  return modules.filter((m) => canSeeModule(viewer, m));
}
