/**
 * One-shot setup: creates org, auth user, profile, and owner membership.
 * Run with:
 *   node scripts/setup-dev.mjs <email> [fullName] [orgSlug] [orgName]
 *
 * Generates a secure random password automatically. To set a specific password:
 *   node scripts/setup-dev.mjs <email> [fullName] [orgSlug] [orgName] --password=YourPass123
 *
 * Reads .env.local from the project root automatically.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually (works on Windows without --env-file flag)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
} catch (e) {
  console.warn('Could not read .env.local, relying on environment variables');
}

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/setup-dev.mjs <email> [fullName] [orgSlug] [orgName] [--password=custom]');
  process.exit(1);
}

const fullName = process.argv[3] ?? 'Admin User';
const orgSlug = process.argv[4] ?? 'guud-mobility';
const orgName = process.argv[5] ?? 'Guud Mobility';

// Check for --password= flag anywhere in args
const passwordArg = process.argv.find(a => a.startsWith('--password='));
const password = passwordArg ? passwordArg.replace('--password=', '') : generatePassword();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// 1) Create or get org
let org;
const { data: existingOrg } = await sb.from('organizations').select('id').eq('slug', orgSlug).single();
if (existingOrg) {
  org = existingOrg;
  console.log(`Org already exists: ${orgSlug}`);
} else {
  const { data: newOrg, error: orgErr } = await sb.from('organizations').insert({ name: orgName, slug: orgSlug }).select().single();
  if (orgErr) { console.error('Failed to create org:', orgErr.message); process.exit(1); }
  org = newOrg;
  console.log(`Created org: ${orgName} (${orgSlug})`);
}

// 2) Create auth user
const { data: userData, error: userErr } = await sb.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

let user;
if (userErr) {
  if (userErr.message.includes('already been registered')) {
    const { data: list } = await sb.auth.admin.listUsers();
    user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    console.log(`User already exists: ${email}`);
  } else {
    console.error('Failed to create user:', userErr.message);
    process.exit(1);
  }
} else {
  user = userData.user;
  console.log(`Created user: ${email}`);
}

// 3) Create profile
const { error: pErr } = await sb.from('profiles').upsert(
  { id: user.id, full_name: fullName, email, job_function: 'central_lead' },
  { onConflict: 'id' },
);
if (pErr) { console.error('Profile upsert failed:', pErr.message); process.exit(1); }

// 4) Create owner membership
const { error: mErr } = await sb.from('memberships').upsert(
  { profile_id: user.id, organization_id: org.id, role: 'owner' },
  { onConflict: 'profile_id,organization_id' },
);
if (mErr) { console.error('Membership upsert failed:', mErr.message); process.exit(1); }

console.log(`\n✅ Setup complete!`);
console.log(`   Email:    ${email}`);
console.log(`   Password: ${password}`);
console.log(`   Org:      ${orgName}`);
console.log(`   Role:     owner`);
console.log(`\n   Login at: http://localhost:3000/login`);
