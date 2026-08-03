/**
 * Seed the starter "Mobile Clinic — Daily Opening" checklist. Idempotent.
 *   node --env-file=.env.local scripts/seed-checklist.mjs [orgSlug]
 */
import { createClient } from '@supabase/supabase-js';

const orgSlug = process.argv[2] ?? 'guud-mobility';
const TEMPLATE_NAME = 'Mobile Clinic — Daily Opening';

const ITEMS = [
  ['Vehicle exterior clean and roadworthy', 'bool', true, true, null, null],
  ['Generator / fuel level adequate', 'bool', true, true, null, null],
  ['Fridge temperature (°C)', 'number', true, false, 2, 8],
  ['Handwashing station stocked', 'bool', true, true, null, null],
  ['Sharps container less than 2/3 full', 'bool', true, true, null, null],
  ['Optical equipment powered and working', 'bool', true, true, null, null],
  ['Spectacle frame stock counted', 'bool', true, true, null, null],
  ['First aid kit present and sealed', 'bool', true, true, null, null],
  ['Patients booked today', 'number', false, false, null, null],
  ['Issues or notes', 'text', false, false, null, null],
];

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: org } = await sb
  .from('organizations').select('id').eq('slug', orgSlug).single();
if (!org) { console.error('org not found'); process.exit(1); }

let { data: tmpl } = await sb
  .from('checklist_templates').select('id')
  .eq('organization_id', org.id).eq('name', TEMPLATE_NAME).maybeSingle();

if (!tmpl) {
  const { data, error } = await sb.from('checklist_templates')
    .insert({ organization_id: org.id, name: TEMPLATE_NAME, target_job: 'mum', frequency: 'daily' })
    .select('id').single();
  if (error) { console.error('template insert failed:', error.message); process.exit(1); }
  tmpl = data;
}

const { count } = await sb
  .from('checklist_items').select('id', { count: 'exact', head: true })
  .eq('template_id', tmpl.id);

if (!count) {
  const rows = ITEMS.map((it, i) => ({
    template_id: tmpl.id, position: i + 1, label: it[0], input_type: it[1],
    required: it[2], flag_when_false: it[3], min_value: it[4], max_value: it[5],
  }));
  const { error } = await sb.from('checklist_items').insert(rows);
  if (error) { console.error('items insert failed:', error.message); process.exit(1); }
}

const { count: finalCount } = await sb
  .from('checklist_items').select('id', { count: 'exact', head: true })
  .eq('template_id', tmpl.id);

console.log(`OK: template "${TEMPLATE_NAME}" ready with ${finalCount} items (id ${tmpl.id})`);
