-- =============================================================================
-- 0004_daily_reports.sql — Daily mobile report-back (RM previous-day stats)
-- One row per mobile per service day. Goodx/iTrust fields are manual for now
-- and become auto-populated when those integrations land.
-- =============================================================================

create table if not exists public.daily_reports (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  location_id        uuid not null references public.locations(id) on delete cascade,
  service_date       date not null,
  start_of_services  time,
  end_of_services    time,
  first_enrolled_at  time,
  first_phc_at       time,
  avg_phc_minutes    numeric,   -- Goodx
  specs_dispensed    integer,   -- iTrust
  specs_no_stock     integer,   -- feeds cumulative backlog
  notes              text,
  submitted_by       uuid references public.profiles(id) on delete set null,
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (location_id, service_date)
);

drop trigger if exists set_updated_at on public.daily_reports;
create trigger set_updated_at before update on public.daily_reports
  for each row execute function public.set_updated_at();

alter table public.daily_reports enable row level security;

-- Anyone with access to the mobile can read + write its report (MUM enters,
-- RM/owner view; region scoping is handled by user_has_location_access).
drop policy if exists report_access on public.daily_reports;
create policy report_access on public.daily_reports for all
  using (public.user_has_location_access(location_id))
  with check (public.user_has_location_access(location_id));
