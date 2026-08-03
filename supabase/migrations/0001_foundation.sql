-- =============================================================================
-- 0001_foundation.sql — Guud OS chassis: tenancy, identity & RLS
-- -----------------------------------------------------------------------------
-- Hierarchy:  organization ──< region ──< location (= "mobile" healthcare unit)
-- Identity:   profiles (1:1 auth.users) ──< memberships (role + capabilities)
--
-- Access model (kept in sync with src/lib/roles.ts + src/domain/access):
--   owner       = Central Lead      → whole organization, every capability
--   manager     = Regional Manager  → one region (membership.region_id)
--   supervisor  = MUM               → assigned mobile(s) via location_memberships
--   staff       = Professional/Op   → assigned mobile(s), no mgmt capabilities
--
-- RLS strategy: helper fns are SECURITY DEFINER so they read membership rows
-- without re-triggering RLS (avoids policy recursion).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh on every table
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('owner', 'manager', 'supervisor', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_function as enum (
    'central_lead', 'regional_manager', 'mum', 'nurse', 'optical_dispenser', 'operator'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tenancy tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.regions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);

-- A "location" is a mobile healthcare unit.
create table if not exists public.locations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  region_id        uuid not null references public.regions(id) on delete restrict,
  name             text not null,          -- e.g. "Mobile 07"
  code             text,                   -- external ref (schedules/Guud Pro id)
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);

-- ---------------------------------------------------------------------------
-- Identity tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  email         text,
  job_function  public.job_function,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.memberships (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  role             public.app_role not null default 'staff',
  -- Regional Managers are scoped to one region; null for owners (all regions).
  region_id        uuid references public.regions(id) on delete set null,
  -- Explicit capability grants layered on top of role defaults.
  capabilities     text[] not null default '{}',
  is_read_only     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (profile_id, organization_id)
);

-- Which mobiles a supervisor/staff member is assigned to.
create table if not exists public.location_memberships (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  location_id  uuid not null references public.locations(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (profile_id, location_id)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers on every table
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','regions','locations','profiles','memberships','location_memberships'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER — bypass RLS internally)
-- ---------------------------------------------------------------------------

-- Orgs the current user belongs to.
create or replace function public.user_org_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select organization_id from public.memberships where profile_id = auth.uid();
$$;

-- Is the current user an owner (Central Lead) of the given org?
create or replace function public.user_is_org_admin(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where profile_id = auth.uid() and organization_id = org and role = 'owner'
  );
$$;

-- Regions the current user can see.
--   owner   → every region in their orgs
--   manager → their membership.region_id
--   sup/staff → regions of their assigned mobiles
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
  where m.profile_id = auth.uid() and m.role = 'manager' and m.region_id is not null
  union
  select l.region_id
  from public.location_memberships lm
  join public.locations l on l.id = lm.location_id
  where lm.profile_id = auth.uid();
$$;

-- Can the current user access this mobile?
create or replace function public.user_has_location_access(loc uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.locations l
    where l.id = loc and l.region_id in (select public.user_region_ids())
  ) or exists (
    select 1 from public.location_memberships lm
    where lm.profile_id = auth.uid() and lm.location_id = loc
  );
$$;

-- Generic capability gate. Encodes the SAME defaults as
-- src/domain/access/capabilities.ts::ROLE_DEFAULT_CAPABILITIES.
create or replace function public.user_has_capability(org uuid, cap text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.profile_id = auth.uid()
      and m.organization_id = org
      and (
        m.role = 'owner'
        or (m.role = 'manager' and cap = any(array[
             'view_labour','view_vision','view_stock','view_assessments','manage_checklists']))
        or (m.role = 'supervisor' and cap = any(array['manage_checklists']))
        or cap = any(m.capabilities)
      )
  );
$$;

-- Convenience wrappers (readable in policies).
create or replace function public.user_can_view_labour(org uuid) returns boolean
  language sql stable as $$ select public.user_has_capability(org, 'view_labour'); $$;
create or replace function public.user_can_view_vision(org uuid) returns boolean
  language sql stable as $$ select public.user_has_capability(org, 'view_vision'); $$;
create or replace function public.user_can_view_stock(org uuid) returns boolean
  language sql stable as $$ select public.user_has_capability(org, 'view_stock'); $$;
create or replace function public.user_can_view_assessments(org uuid) returns boolean
  language sql stable as $$ select public.user_has_capability(org, 'view_assessments'); $$;
create or replace function public.user_can_manage_checklists(org uuid) returns boolean
  language sql stable as $$ select public.user_has_capability(org, 'manage_checklists'); $$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.organizations       enable row level security;
alter table public.regions             enable row level security;
alter table public.locations           enable row level security;
alter table public.profiles            enable row level security;
alter table public.memberships         enable row level security;
alter table public.location_memberships enable row level security;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- organizations: members read; owners manage.
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select
  using (id in (select public.user_org_ids()));
drop policy if exists org_manage on public.organizations;
create policy org_manage on public.organizations for all
  using (public.user_is_org_admin(id)) with check (public.user_is_org_admin(id));

-- regions: visible per user_region_ids; owners manage.
drop policy if exists region_select on public.regions;
create policy region_select on public.regions for select
  using (id in (select public.user_region_ids()));
drop policy if exists region_manage on public.regions;
create policy region_manage on public.regions for all
  using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

-- locations (mobiles): visible if accessible; managers+ of the org manage.
drop policy if exists location_select on public.locations;
create policy location_select on public.locations for select
  using (public.user_has_location_access(id));
drop policy if exists location_manage on public.locations;
create policy location_manage on public.locations for all
  using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

-- profiles: read own + anyone in your orgs; update only your own row.
drop policy if exists profile_select on public.profiles;
create policy profile_select on public.profiles for select
  using (
    id = auth.uid()
    or id in (
      select m.profile_id from public.memberships m
      where m.organization_id in (select public.user_org_ids())
    )
  );
drop policy if exists profile_update_own on public.profiles;
create policy profile_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profile_insert_own on public.profiles;
create policy profile_insert_own on public.profiles for insert
  with check (id = auth.uid());

-- memberships: read own + (owners read all org memberships); owners manage.
drop policy if exists membership_select on public.memberships;
create policy membership_select on public.memberships for select
  using (profile_id = auth.uid() or public.user_is_org_admin(organization_id));
drop policy if exists membership_manage on public.memberships;
create policy membership_manage on public.memberships for all
  using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

-- location_memberships: read own + owners; owners manage.
drop policy if exists locmem_select on public.location_memberships;
create policy locmem_select on public.location_memberships for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.locations l
      where l.id = location_id and public.user_is_org_admin(l.organization_id)
    )
  );
drop policy if exists locmem_manage on public.location_memberships;
create policy locmem_manage on public.location_memberships for all
  using (exists (
    select 1 from public.locations l
    where l.id = location_id and public.user_is_org_admin(l.organization_id)))
  with check (exists (
    select 1 from public.locations l
    where l.id = location_id and public.user_is_org_admin(l.organization_id)));
