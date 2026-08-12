-- =============================================================================
-- 0005_vision.sql — Vision: spectacles cut vs not-cut per mobile per day.
-- Manual entry now; the Guud Vision dashboard integration upserts these later.
-- =============================================================================

create table if not exists public.vision_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  location_id      uuid not null references public.locations(id) on delete cascade,
  entry_date       date not null,
  specs_cut        integer not null default 0,
  specs_not_cut    integer not null default 0,
  source           text not null default 'app', -- app | guud_vision
  submitted_by     uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (location_id, entry_date)
);

drop trigger if exists set_updated_at on public.vision_entries;
create trigger set_updated_at before update on public.vision_entries
  for each row execute function public.set_updated_at();

alter table public.vision_entries enable row level security;

drop policy if exists vision_access on public.vision_entries;
create policy vision_access on public.vision_entries for all
  using (public.user_has_location_access(location_id))
  with check (public.user_has_location_access(location_id));
