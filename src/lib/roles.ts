/**
 * Client-safe source of truth for access roles, capabilities and job functions.
 *
 * IMPORTANT: this file must never import `server-only`. Both server code
 * (services/infrastructure) and client components (features) import from here,
 * so it has to stay dependency-free and isomorphic.
 *
 * Two distinct concepts live here on purpose:
 *  - `Role`        → what you can *see/do* (access control). Maps to RLS gates.
 *  - `JobFunction` → what you *are* on a mobile (domain role). Drives workflow,
 *                    not permissions.
 */

// ---------------------------------------------------------------------------
// Access roles — the chassis's four-tier model, mapped onto Guud's 3 mgmt tiers
// ---------------------------------------------------------------------------

export const ROLES = ['owner', 'manager', 'supervisor', 'staff'] as const;
export type Role = (typeof ROLES)[number];

/** Guud's language for each access role, shown in the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Central Lead', // Jordan / Gareth / Simphiwe — all regions
  manager: 'Regional Manager', // Jonathan / Kyle / Anleo / Andre — their region
  supervisor: 'MUM', // Mobile Unit Manager — on-site, their mobile(s)
  staff: 'Professional / Operator', // clock + checklists on their assigned mobile
};

/** Higher number = broader scope. Used for "at least this role" checks. */
export const ROLE_RANK: Record<Role, number> = {
  staff: 0,
  supervisor: 1,
  manager: 2,
  owner: 3,
};

// ---------------------------------------------------------------------------
// Capabilities — per-person grants layered on top of role defaults
// ---------------------------------------------------------------------------

export const CAPABILITIES = [
  'view_labour', // lateness / hours / cost-of-labour module
  'view_vision', // spectacles cut vs not-cut (Guud Vision dashboard)
  'view_stock', // Unleashed stock ordering
  'view_assessments', // assessment trackers (Metabase)
  'view_hr', // sensitive HR data
  'manage_checklists', // create/edit checklist templates
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// ---------------------------------------------------------------------------
// Job functions — domain role (who does what on a mobile)
// ---------------------------------------------------------------------------

export const JOB_FUNCTIONS = [
  'central_lead',
  'regional_manager',
  'mum',
  'nurse',
  'optical_dispenser',
  'operator',
] as const;
export type JobFunction = (typeof JOB_FUNCTIONS)[number];

export const JOB_FUNCTION_LABELS: Record<JobFunction, string> = {
  central_lead: 'Central Lead',
  regional_manager: 'Regional Manager',
  mum: 'Mobile Unit Manager',
  nurse: 'Nurse',
  optical_dispenser: 'Optical Dispenser',
  operator: 'Operator',
};
