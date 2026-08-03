-- =============================================================================
-- 0002_checklists.sql — Checklists module (replaces Fyne Forms)
-- templates → items ; per mobile per day: instances → responses ; flags → tickets
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.checklist_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  target_job       public.job_function,        -- who fills it; null = anyone on the mobile
  frequency        text not null default 'daily', -- daily | per_shift | ad_hoc
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references public.checklist_templates(id) on delete cascade,
  position         int not null default 0,
  label            text not null,
  input_type       text not null default 'bool', -- bool | number | text
  required         boolean not null default true,
  flag_when_false  boolean not null default true, -- bool: flag when answered "No"
  min_value        numeric,                        -- number: flag if < min
  max_value        numeric,                        -- number: flag if > max
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.checklist_instances (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.checklist_templates(id) on delete cascade,
  location_id   uuid not null references public.locations(id) on delete cascade,
  service_date  date not null,
  status        text not null default 'pending', -- pending | in_progress | completed
  completed_by  uuid references public.profiles(id) on delete set null,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (template_id, location_id, service_date)
);

create table if not exists public.checklist_responses (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references public.checklist_instances(id) on delete cascade,
  item_id       uuid not null references public.checklist_items(id) on delete cascade,
  value_bool    boolean,
  value_number  numeric,
  value_text    text,
  flagged       boolean not null default false,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (instance_id, item_id)
);

-- Local ticket store. Flagged checklist items land here; a later pass pushes
-- them to tickets.driving.guudapp.co and records external_id.
create table if not exists public.tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  location_id      uuid references public.locations(id) on delete set null,
  source           text not null default 'checklist', -- checklist | manual
  source_ref       uuid,
  title            text not null,
  description      text,
  status           text not null default 'open',       -- open | pushed | closed
  external_id      text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'checklist_templates','checklist_items','checklist_instances',
    'checklist_responses','tickets'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.checklist_templates enable row level security;
alter table public.checklist_items     enable row level security;
alter table public.checklist_instances enable row level security;
alter table public.checklist_responses enable row level security;
alter table public.tickets             enable row level security;

-- templates: any org member reads; manage_checklists capability writes.
drop policy if exists tmpl_select on public.checklist_templates;
create policy tmpl_select on public.checklist_templates for select
  using (organization_id in (select public.user_org_ids()));
drop policy if exists tmpl_manage on public.checklist_templates;
create policy tmpl_manage on public.checklist_templates for all
  using (public.user_has_capability(organization_id, 'manage_checklists'))
  with check (public.user_has_capability(organization_id, 'manage_checklists'));

-- items: readable/writable with the parent template.
drop policy if exists item_select on public.checklist_items;
create policy item_select on public.checklist_items for select
  using (exists (
    select 1 from public.checklist_templates t
    where t.id = template_id and t.organization_id in (select public.user_org_ids())));
drop policy if exists item_manage on public.checklist_items;
create policy item_manage on public.checklist_items for all
  using (exists (
    select 1 from public.checklist_templates t
    where t.id = template_id and public.user_has_capability(t.organization_id, 'manage_checklists')))
  with check (exists (
    select 1 from public.checklist_templates t
    where t.id = template_id and public.user_has_capability(t.organization_id, 'manage_checklists')));

-- instances: anyone with access to the mobile can read + fill.
drop policy if exists inst_access on public.checklist_instances;
create policy inst_access on public.checklist_instances for all
  using (public.user_has_location_access(location_id))
  with check (public.user_has_location_access(location_id));

-- responses: gated through the instance's mobile.
drop policy if exists resp_access on public.checklist_responses;
create policy resp_access on public.checklist_responses for all
  using (exists (
    select 1 from public.checklist_instances i
    where i.id = instance_id and public.user_has_location_access(i.location_id)))
  with check (exists (
    select 1 from public.checklist_instances i
    where i.id = instance_id and public.user_has_location_access(i.location_id)));

-- tickets: read/create for people with access to the mobile (or org owners).
drop policy if exists ticket_select on public.tickets;
create policy ticket_select on public.tickets for select
  using (
    (location_id is not null and public.user_has_location_access(location_id))
    or public.user_is_org_admin(organization_id));
drop policy if exists ticket_insert on public.tickets;
create policy ticket_insert on public.tickets for insert
  with check (
    (location_id is not null and public.user_has_location_access(location_id))
    or public.user_is_org_admin(organization_id));
drop policy if exists ticket_update on public.tickets;
create policy ticket_update on public.tickets for update
  using (public.user_is_org_admin(organization_id))
  with check (public.user_is_org_admin(organization_id));
