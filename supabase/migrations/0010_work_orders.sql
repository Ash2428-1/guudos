-- =============================================================================
-- 0010_work_orders.sql — Work Order → Movement Order module (manager & above).
-- work_orders (client engagement) → movement_orders (deployment plan) with
-- movement_legs (day-by-day itinerary). Team + POC contacts stored as jsonb.
-- =============================================================================

-- Management gate: owner or manager (above-mobile).
create or replace function public.user_is_management(org uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.profile_id = auth.uid()
      and m.organization_id = org
      and m.role in ('owner', 'manager')
  );
$$;

create table if not exists public.work_orders (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  created_by           uuid references public.profiles(id) on delete set null,
  status               text not null default 'draft', -- draft | confirmed
  client_name          text,
  skae_contact         text,
  client_approval      boolean,
  total_employees      integer,
  employees_to_assess  integer,
  mobiles_required     integer,
  assessment_dates     text,
  sites                text,
  operational_times    text,
  arrival_info         text,
  site_checkin_time    text,
  access_requirements  text,
  parking              boolean,
  overnight_parking    boolean,
  plug_point           text,
  network              text,
  waste_disposal       text,
  services             text,
  vehicle_requirements text,
  hs_officer           text,
  referral_details     text,
  contact_on_site      text,
  notes                text,
  source_file_path     text,   -- uploaded work-order photo/PDF
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.movement_orders (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  work_order_id     uuid references public.work_orders(id) on delete set null,
  location_id       uuid references public.locations(id) on delete set null, -- the mobile (MAC)
  created_by        uuid references public.profiles(id) on delete set null,
  status            text not null default 'draft',
  project_name      text,
  manager           text,
  region            text,
  reason_for_travel text,
  mac_name          text,
  mac_reg           text,
  province          text,
  start_date        date,
  starting_point    text,
  team              jsonb,  -- [{ role, name, phone }]
  poc_contacts      jsonb,  -- [{ group, role, name, phone }]
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.movement_legs (
  id                uuid primary key default gen_random_uuid(),
  movement_order_id uuid not null references public.movement_orders(id) on delete cascade,
  seq               integer not null default 0,
  leg_date          date,
  from_loc          text,
  to_loc            text,
  detail            text,
  notes             text,
  maps_link         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['work_orders','movement_orders','movement_legs'] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

alter table public.work_orders     enable row level security;
alter table public.movement_orders enable row level security;
alter table public.movement_legs   enable row level security;

drop policy if exists wo_access on public.work_orders;
create policy wo_access on public.work_orders for all
  using (public.user_is_management(organization_id))
  with check (public.user_is_management(organization_id));

drop policy if exists mo_access on public.movement_orders;
create policy mo_access on public.movement_orders for all
  using (public.user_is_management(organization_id))
  with check (public.user_is_management(organization_id));

drop policy if exists leg_access on public.movement_legs;
create policy leg_access on public.movement_legs for all
  using (exists (
    select 1 from public.movement_orders mo
    where mo.id = movement_order_id and public.user_is_management(mo.organization_id)))
  with check (exists (
    select 1 from public.movement_orders mo
    where mo.id = movement_order_id and public.user_is_management(mo.organization_id)));
