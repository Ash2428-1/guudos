-- =============================================================================
-- seed.sql — bootstrap Guud Mobility (run in the Supabase SQL editor)
-- Run AFTER applying migrations/0001_foundation.sql.
-- =============================================================================

-- 1) Organization + one region + one mobile (rename freely). ------------------
insert into public.organizations (name, slug)
values ('Guud Mobility', 'guud-mobility')
on conflict (slug) do nothing;

insert into public.regions (organization_id, name)
select id, 'Western Cape' from public.organizations where slug = 'guud-mobility'
on conflict (organization_id, name) do nothing;

insert into public.locations (organization_id, region_id, name, code)
select o.id, r.id, 'Mobile 01', 'M01'
from public.organizations o
join public.regions r on r.organization_id = o.id and r.name = 'Western Cape'
where o.slug = 'guud-mobility'
on conflict (organization_id, name) do nothing;

-- 2) Grant YOURSELF owner (Central Lead). --------------------------------------
--    Run this block ONLY AFTER you've signed in once (so auth.users has a row).
--    Change the email if needed.
do $$
declare
  v_user  uuid;
  v_org   uuid;
begin
  select id into v_user from auth.users where email = 'jordan@guudmobility.com';
  select id into v_org  from public.organizations where slug = 'guud-mobility';

  if v_user is null then
    raise notice 'No auth user for that email yet — sign in once, then re-run.';
    return;
  end if;

  insert into public.profiles (id, full_name, email, job_function)
  values (v_user, 'Jordan', 'jordan@guudmobility.com', 'central_lead')
  on conflict (id) do nothing;

  insert into public.memberships (profile_id, organization_id, role)
  values (v_user, v_org, 'owner')
  on conflict (profile_id, organization_id) do update set role = 'owner';
end $$;
