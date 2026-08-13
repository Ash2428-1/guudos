-- =============================================================================
-- 0007_fix_region_scope.sql — tighten scoping.
-- Only owners (all regions) and managers (their region) get region-level
-- access. Supervisors/staff are scoped to their specific mobiles via
-- location_memberships only (user_has_location_access already ORs that in),
-- so a MUM sees ONLY their mobile — not every mobile that shares its region.
-- =============================================================================

create or replace function public.user_region_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select r.id
  from public.regions r
  join public.memberships m
    on m.organization_id = r.organization_id
   and m.profile_id = auth.uid()
   and m.role = 'owner'
  union
  select m.region_id
  from public.memberships m
  where m.profile_id = auth.uid()
    and m.role = 'manager'
    and m.region_id is not null;
$$;
