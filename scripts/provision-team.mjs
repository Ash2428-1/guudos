/**
 * One-off: provision leadership + RMs + their regions. Additive, no emails sent
 * (createUser with email_confirm; users set a password later via the app).
 *   node --env-file=.env.local scripts/provision-team.mjs
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: org } = await sb
  .from('organizations').select('id').eq('slug', 'guud-mobility').single();

// 1) Regions
const REGIONS = ['Gauteng + Rustenburg', 'KZN + Limpopo', 'Eastern Cape', 'SIOC'];
const regionId = {};
for (const name of REGIONS) {
  let { data } = await sb.from('regions').select('id')
    .eq('organization_id', org.id).eq('name', name).maybeSingle();
  if (!data) {
    const r = await sb.from('regions').insert({ organization_id: org.id, name })
      .select('id').single();
    data = r.data;
  }
  regionId[name] = data.id;
}

// 2) Move each RM's mobiles into their region (by GM name)
const MOVES = {
  'Gauteng + Rustenburg': ['GM1', 'GM3', 'GM5'],
  'KZN + Limpopo': ['GM4'],
  'Eastern Cape': ['GM2'],
  SIOC: ['GM6', 'GM7', 'GM8'],
};
for (const [rname, names] of Object.entries(MOVES)) {
  for (const n of names) {
    await sb.from('locations').update({ region_id: regionId[rname] })
      .eq('organization_id', org.id).eq('name', n);
  }
}

// 3) People
const { data: list } = await sb.auth.admin.listUsers();
const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

async function ensureUser(email, fullName, role, jobFunction, region) {
  let u = byEmail.get(email.toLowerCase());
  if (!u) {
    const { data, error } = await sb.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (error) { console.log('createUser FAIL', email, error.message); return; }
    u = data.user;
  }
  await sb.from('profiles').upsert(
    { id: u.id, full_name: fullName, email, job_function: jobFunction },
    { onConflict: 'id' },
  );
  await sb.from('memberships').upsert(
    { profile_id: u.id, organization_id: org.id, role, region_id: region ? regionId[region] : null },
    { onConflict: 'profile_id,organization_id' },
  );
  console.log('ok', email, '->', role, region ?? '(all regions)');
}

await ensureUser('gareth@guud.global', 'Gareth', 'owner', 'central_lead', null);
await ensureUser('fernando@guud.global', 'Fernando', 'owner', 'central_lead', null);
await ensureUser('jonathan@guudmobility.com', 'Jonathan Duncan', 'manager', 'regional_manager', 'Gauteng + Rustenburg');
await ensureUser('andre@guudmobility.com', 'Andre Van Rensburg', 'manager', 'regional_manager', 'KZN + Limpopo');
await ensureUser('kyle@guudmobility.com', 'Kyle Jones', 'manager', 'regional_manager', 'Eastern Cape');
console.log('DONE');
