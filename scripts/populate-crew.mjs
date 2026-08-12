/**
 * Populate mobile_crew from the staff CSV (Mobile,Role,Name,Email).
 * Clean reload (deletes existing crew for the org first). Run AFTER 0006.
 *   node --env-file=.env.local scripts/populate-crew.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const CSV = 'C:/Users/Jordan/Downloads/Guud staff emails to fill.csv';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: org } = await sb
  .from('organizations').select('id').eq('slug', 'guud-mobility').single();
const { data: locs } = await sb
  .from('locations').select('id, name').eq('organization_id', org.id);
const locByName = new Map(locs.map((l) => [l.name, l.id]));

const lines = readFileSync(CSV, 'utf8').split(/\r?\n/).slice(1).filter(Boolean);
const rows = [];
const missing = new Set();
for (const line of lines) {
  const m = line.match(/^([^,]*),([^,]*),"([^"]*)"/) || line.match(/^([^,]*),([^,]*),([^,]*),/);
  if (!m) continue;
  const mobile = m[1].trim();
  const role = m[2].trim();
  const name = m[3].trim();
  if (!name) continue;
  const locId = locByName.get(mobile);
  if (!locId) { missing.add(mobile); continue; }
  rows.push({ organization_id: org.id, location_id: locId, role, name });
}

await sb.from('mobile_crew').delete().eq('organization_id', org.id);
const { error } = await sb.from('mobile_crew').insert(rows);
if (error) { console.log('insert error:', error.message); process.exit(1); }
console.log('inserted crew:', rows.length, missing.size ? `| unmatched mobiles: ${[...missing].join(', ')}` : '');
