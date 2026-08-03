-- =============================================================================
-- seed_checklists.sql — a realistic starter checklist for Guud Mobility.
-- Idempotent: safe to run more than once. Run AFTER 0002_checklists.sql.
-- =============================================================================

-- Template (MUM daily opening check).
insert into public.checklist_templates (organization_id, name, target_job, frequency)
select o.id, 'Mobile Clinic — Daily Opening', 'mum', 'daily'
from public.organizations o
where o.slug = 'guud-mobility'
  and not exists (
    select 1 from public.checklist_templates t
    where t.organization_id = o.id and t.name = 'Mobile Clinic — Daily Opening');

-- Items.
insert into public.checklist_items
  (template_id, position, label, input_type, required, flag_when_false, min_value, max_value)
select t.id, v.position, v.label, v.input_type, v.required, v.flag_when_false, v.min_value, v.max_value
from public.checklist_templates t
join (values
  (1, 'Vehicle exterior clean and roadworthy', 'bool',   true,  true,  null::numeric, null::numeric),
  (2, 'Generator / fuel level adequate',       'bool',   true,  true,  null,          null),
  (3, 'Fridge temperature (°C)',               'number', true,  false, 2,             8),
  (4, 'Handwashing station stocked',           'bool',   true,  true,  null,          null),
  (5, 'Sharps container less than 2/3 full',   'bool',   true,  true,  null,          null),
  (6, 'Optical equipment powered and working', 'bool',   true,  true,  null,          null),
  (7, 'Spectacle frame stock counted',         'bool',   true,  true,  null,          null),
  (8, 'First aid kit present and sealed',      'bool',   true,  true,  null,          null),
  (9, 'Patients booked today',                 'number', false, false, null,          null),
  (10,'Issues or notes',                       'text',   false, false, null,          null)
) as v(position, label, input_type, required, flag_when_false, min_value, max_value) on true
where t.organization_id = (select id from public.organizations where slug = 'guud-mobility')
  and t.name = 'Mobile Clinic — Daily Opening'
  and not exists (select 1 from public.checklist_items ci where ci.template_id = t.id);
