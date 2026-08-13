/**
 * Provision MUMs (supervisor, scoped to their mobile), an ops-lead manager,
 * and Simphiwe (owner). Additive; no emails sent (createUser email_confirm).
 *   node --env-file=.env.local scripts/provision-batch2.mjs
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: org } = await sb
  .from('organizations').select('id').eq('slug', 'guud-mobility').single();

async function regionId(name) {
  const { data } = await sb.from('regions').select('id')
    .eq('organization_id', org.id).eq('name', name).maybeSingle();
  return data?.id ?? null;
}
async function locId(name) {
  const { data } = await sb.from('locations').select('id')
    .eq('organization_id', org.id).eq('name', name).maybeSingle();
  return data?.id ?? null;
}

const { data: list } = await sb.auth.admin.listUsers();
const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]));

async function ensureUser(email, fullName, role, jobFunction, regionName) {
  let u = byEmail.get(email.toLowerCase());
  if (!u) {
    const { data, error } = await sb.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (error) { console.log('FAIL', email, error.message); return null; }
    u = data.user;
  }
  await sb.from('profiles').upsert(
    { id: u.id, full_name: fullName, email, job_function: jobFunction },
    { onConflict: 'id' },
  );
  const rid = regionName ? await regionId(regionName) : null;
  await sb.from('memberships').upsert(
    { profile_id: u.id, organization_id: org.id, role, region_id: rid },
    { onConflict: 'profile_id,organization_id' },
  );
  console.log('ok', email, '->', role, regionName ?? '');
  return u.id;
}

async function assignMobile(uid, mobileName) {
  if (!uid) return;
  const lid = await locId(mobileName);
  if (!lid) { console.log('  (no mobile', mobileName, ')'); return; }
  await sb.from('location_memberships').upsert(
    { profile_id: uid, location_id: lid },
    { onConflict: 'profile_id,location_id' },
  );
  console.log('  assigned', mobileName);
}

await ensureUser('simphiwe@guuddrivers.com', 'Simphiwe', 'owner', 'central_lead', null);
await ensureUser('phumelela@guudhealth.co.za', 'Phumelela Khumalo', 'manager', 'regional_manager', 'Gauteng + Rustenburg');

const mums = [
  ['sithembile@guudhealth.co.za', 'Sithembile Daza', 'GM5'],
  ['zolani@guuddrivers.com', 'Zolani Bhaka', 'GM2'],
  ['brian@guudmobility.com', 'Brian Ndlangisa', 'GM4'],
  ['wiseborn@guudmobility.com', 'Wiseborn Chauka', 'GM1'],
];
for (const [email, name, mobile] of mums) {
  const uid = await ensureUser(email, name, 'supervisor', 'mum', null);
  await assignMobile(uid, mobile);
}
console.log('DONE');
