/**
 * Import Fyne Forms (JSON Schema exports) as Guud OS checklist templates.
 *   node --env-file=.env.local scripts/import-fyne.mjs "<file1.json>" "<file2.json>" ...
 *
 * Mapping:
 *  - single_choice / anything with options -> 'select' (options carried over)
 *  - number -> 'number' (min/max)
 *  - string -> 'text'  (Wrike-link fields dropped; Guud auto-raises tickets)
 *  - latlng / signature / file_upload / date / "select your vehicle" -> skipped
 *  - unknown component -> captured as optional text
 * Flagging (option raises a ticket) is derived from: the form's own conditional
 * "escalate" rules (a value that reveals a Wrike-link field), plus ❌ labels and
 * "No" answers. Re-runnable: re-importing a form reloads its items.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const inferJob = (t) => {
  const s = t.toLowerCase();
  if (s.includes('operator')) return 'operator';
  if (s.includes('shutdown') || s.includes('manager') || s.includes('mum') || s.includes('monthly')) return 'mum';
  return null;
};
const inferFreq = (t) => {
  const s = t.toLowerCase();
  if (s.includes('monthly')) return 'monthly';
  if (s.includes('weekly')) return 'weekly';
  return 'daily';
};

/** field id -> Set(values that escalate) — only conditionals revealing a Wrike-link field. */
function flagValues(schema) {
  const props = schema.properties ?? {};
  const map = {};
  for (const c of schema.allOf ?? []) {
    const thenReq = c.then?.required ?? [];
    const escalates = thenReq.some((id) => {
      const cfg = props[id]?.config ?? {};
      return (cfg.identifier ?? '').toLowerCase().startsWith('wrike') ||
        (cfg.label ?? '').toLowerCase().includes('wrike');
    });
    if (!escalates) continue;
    const conds = [...(c.if?.allOf ?? []), ...(c.if?.anyOf ?? []), ...(c.if?.oneOf ?? [])];
    for (const cond of conds) {
      for (const [fid, spec] of Object.entries(cond.properties ?? {})) {
        if (spec?.const !== undefined) (map[fid] ??= new Set()).add(spec.const);
      }
    }
  }
  return map;
}

function convert(schema) {
  const props = schema.properties ?? {};
  const fv = flagValues(schema);
  const items = [];
  const skipped = {};
  let pos = 0;
  const skip = (k) => { skipped[k] = (skipped[k] ?? 0) + 1; };

  for (const container of schema.layout?.items ?? []) {
    const section = container.config?.title ?? null;
    for (const ref of container.items ?? []) {
      const key = ref.config?.refKey;
      const p = key && props[key];
      if (!p) continue;
      const comp = p.component;
      const cfg = p.config ?? {};
      const label = cfg.label ?? '';
      const idf = (cfg.identifier ?? '').toLowerCase();
      const required = !!cfg.required;

      if (['latlng', 'signature', 'date'].includes(comp)) { skip(comp); continue; }
      if (comp === 'single_choice' && idf === 'vehicle') { skip('vehicle'); continue; }
      if (comp === 'string' && (idf.startsWith('wrike') || label.toLowerCase().includes('wrike'))) { skip('wrike-link'); continue; }

      pos += 1;
      const base = { position: pos, label, required, section, options: null, min_value: null, max_value: null, flag_when_false: true };

      if (comp === 'single_choice' || (Array.isArray(cfg.options) && cfg.options.length)) {
        const set = fv[key] ?? new Set();
        const options = (cfg.options ?? []).map((o) => {
          const value = String(o.value ?? o.label);
          const isNo = value.trim().toLowerCase() === 'no' || String(o.label).trim().toLowerCase() === 'no';
          const flag = set.has(o.value) || set.has(value) || isNo || String(o.label).includes('❌');
          return { label: o.label, value, flag };
        });
        items.push({ ...base, input_type: 'select', options });
      } else if (comp === 'file_upload') {
        items.push({ ...base, input_type: 'photo' });
      } else if (comp === 'number') {
        items.push({ ...base, input_type: 'number', min_value: cfg.minValue ?? null, max_value: cfg.maxValue ?? null });
      } else if (comp === 'string') {
        items.push({ ...base, input_type: 'text' });
      } else {
        skip('~' + comp);
        items.push({ ...base, label: label || comp, input_type: 'text', required: false });
      }
    }
  }
  return { items, skipped };
}

const { data: org } = await sb.from('organizations').select('id').eq('slug', 'guud-mobility').single();
const files = process.argv.slice(2);
if (files.length === 0) { console.log('no files given'); process.exit(1); }

for (const file of files) {
  let schema;
  try { schema = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.log(`SKIP ${basename(file)}: ${e.message}`); continue; }
  const name = schema.title;
  if (!name || !schema.properties) { console.log(`SKIP ${basename(file)}: not a Fyne form`); continue; }

  const { items, skipped } = convert(schema);

  let { data: t } = await sb.from('checklist_templates').select('id')
    .eq('organization_id', org.id).eq('name', name).maybeSingle();
  const meta = { target_job: inferJob(name), frequency: inferFreq(name), is_active: true };
  if (!t) {
    const r = await sb.from('checklist_templates')
      .insert({ organization_id: org.id, name, ...meta }).select('id').single();
    if (r.error) { console.log(`ERR ${name}: ${r.error.message}`); continue; }
    t = r.data;
  } else {
    await sb.from('checklist_templates').update(meta).eq('id', t.id);
    await sb.from('checklist_items').delete().eq('template_id', t.id);
  }

  if (items.length) {
    const { error } = await sb.from('checklist_items').insert(items.map((it) => ({ template_id: t.id, ...it })));
    if (error) { console.log(`ERR items ${name}: ${error.message}`); continue; }
  }
  const flags = items.filter((i) => i.options?.some((o) => o.flag)).length;
  console.log(`✓ ${name} — ${items.length} items (${flags} flag on failure)${Object.keys(skipped).length ? ' | skipped ' + JSON.stringify(skipped) : ''}`);
}
console.log('DONE');
