/**
 * Update user password (or debug auth issues).
 * Run with:
 *   node scripts/reset-password.mjs <email> <newPassword>
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  console.warn('Could not read .env.local');
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-password.mjs <email> <newPassword>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// Find user
const { data: list, error: listErr } = await sb.auth.admin.listUsers();
if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }

const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`User not found: ${email}`);
  console.log('Existing users:', list.users.map(u => u.email).join(', '));
  process.exit(1);
}

console.log('Found user:', user.id);
console.log('Email confirmed:', user.email_confirmed_at ? 'YES' : 'NO');
console.log('Created at:', user.created_at);

// Update password
const { error: updateErr } = await sb.auth.admin.updateUserById(user.id, {
  password: newPassword,
});

if (updateErr) {
  console.error('Failed to update password:', updateErr.message);
  process.exit(1);
}

console.log(`\n✅ Password updated for ${email}`);
console.log(`   New password: ${newPassword}`);
