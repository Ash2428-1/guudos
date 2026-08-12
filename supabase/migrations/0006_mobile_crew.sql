-- =============================================================================
-- 0006_mobile_crew.sql — informational crew roster per mobile (no login).
-- Records who staffs each mobile (operator/optom/dispenser/nurse/etc.).
-- =============================================================================

create table if not exists public.mobile_crew (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  location_id      uuid not null references public.locations(id) on delete cascade,
  role             text not null, -- Operator, Optometrist, Nurse, MUM, ...
  name             text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists mobile_crew_loc_idx on public.mobile_crew (location_id);

drop trigger if exists set_updated_at on public.mobile_crew;
create trigger set_updated_at before update on public.mobile_crew
  for each row execute function public.set_updated_at();

alter table public.mobile_crew enable row level security;

-- Anyone who can see the mobile can see its crew; owners manage.
drop policy if exists crew_select on public.mobile_crew;
create policy crew_select on public.mobile_crew for select
  using (public.user_has_location_access(location_id));
drop policy if exists crew_manage on public.mobile_crew;
create policy crew_manage on public.mobile_crew for all
  using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));
