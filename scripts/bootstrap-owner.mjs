/**
 * Provision a user as an owner (Central Lead) of an organization.
 * Uses the service-role key to bypass RLS. Run with:
 *   node --env-file=.env.local scripts/bootstrap-owner.mjs <email> [fullName] [orgSlug]
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2] ?? 'jordan@guudmobility.com';
const fullName = process.argv[3] ?? 'Jordan';
const orgSlug = process.argv[4] ?? 'guud-mobility';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// 1) Find the auth user by email.
const { data: list, error: listErr } = await sb.auth.admin.listUsers();
if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No signed-in user for ${email} yet — sign in once, then re-run.`);
  process.exit(2);
}

// 2) Find the org.
const { data: org, error: orgErr } = await sb
  .from('organizations').select('id').eq('slug', orgSlug).single();
if (orgErr || !org) { console.error('Org not found:', orgErr?.message); process.exit(1); }

// 3) Upsert profile + owner membership.
const { error: pErr } = await sb.from('profiles').upsert(
  { id: user.id, full_name: fullName, email: user.email, job_function: 'central_lead' },
  { onConflict: 'id' },
);
if (pErr) { console.error('profile upsert failed:', pErr.message); process.exit(1); }

const { error: mErr } = await sb.from('memberships').upsert(
  { profile_id: user.id, organization_id: org.id, role: 'owner' },
  { onConflict: 'profile_id,organization_id' },
);
if (mErr) { console.error('membership upsert failed:', mErr.message); process.exit(1); }

console.log(`OK: ${email} is now owner of ${orgSlug} (user ${user.id})`);
