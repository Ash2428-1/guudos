-- =============================================================================
-- 0003_labour.sql — Clock in/out + Labour (hours / lateness / cost)
-- time_entries feed the Labour engine; pay_rates resolve cost.
-- Designed so a future Guud Pro sync can populate time_entries too.
-- =============================================================================

-- Expected start per mobile drives lateness.
alter table public.locations
  add column if not exists expected_start_time time not null default '08:00';

create table if not exists public.pay_rates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  profile_id       uuid references public.profiles(id) on delete cascade, -- null = job default
  job_function     public.job_function,                                    -- null = person-specific
  hourly_rate      numeric not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.time_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  location_id      uuid not null references public.locations(id) on delete cascade,
  clock_in         timestamptz not null default now(),
  clock_out        timestamptz,
  expected_start   time, -- snapshot at clock-in
  source           text not null default 'app', -- app | guud_pro
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists time_entries_open_idx
  on public.time_entries (profile_id) where clock_out is null;

do $$
declare t text;
begin
  foreach t in array array['pay_rates','time_entries'] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

alter table public.pay_rates    enable row level security;
alter table public.time_entries enable row level security;

-- pay_rates: viewers with the labour capability read; owners manage.
drop policy if exists rate_select on public.pay_rates;
create policy rate_select on public.pay_rates for select
  using (public.user_has_capability(organization_id, 'view_labour'));
drop policy if exists rate_manage on public.pay_rates;
create policy rate_manage on public.pay_rates for all
  using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));

-- time_entries: staff manage their own; management can view for their mobiles.
drop policy if exists te_select on public.time_entries;
create policy te_select on public.time_entries for select
  using (
    profile_id = auth.uid()
    or public.user_has_location_access(location_id)
  );
drop policy if exists te_insert on public.time_entries;
create policy te_insert on public.time_entries for insert
  with check (profile_id = auth.uid());
drop policy if exists te_update on public.time_entries;
create policy te_update on public.time_entries for update
  using (profile_id = auth.uid() or public.user_is_org_admin(organization_id))
  with check (profile_id = auth.uid() or public.user_is_org_admin(organization_id));
