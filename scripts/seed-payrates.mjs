/**
 * Seed placeholder job-level hourly rates (ZAR). Idempotent — skips jobs that
 * already have a default rate. Adjust these to real numbers later.
 *   node --env-file=.env.local scripts/seed-payrates.mjs
 */
import { createClient } from '@supabase/supabase-js';

const RATES = {
  central_lead: 120,
  regional_manager: 90,
  mum: 60,
  nurse: 55,
  optical_dispenser: 50,
  operator: 35,
};

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: org } = await sb
  .from('organizations').select('id').eq('slug', 'guud-mobility').single();
if (!org) { console.error('org not found'); process.exit(1); }

const { data: existing } = await sb
  .from('pay_rates').select('job_function').is('profile_id', null);
const have = new Set((existing ?? []).map((r) => r.job_function));

const toInsert = Object.entries(RATES)
  .filter(([job]) => !have.has(job))
  .map(([job, rate]) => ({ organization_id: org.id, job_function: job, hourly_rate: rate }));

if (toInsert.length) {
  const { error } = await sb.from('pay_rates').insert(toInsert);
  if (error) { console.error('insert failed:', error.message); process.exit(1); }
}
console.log(`OK: ${toInsert.length} rate(s) added, ${have.size} already present`);
