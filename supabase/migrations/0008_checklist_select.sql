-- =============================================================================
-- 0008_checklist_select.sql — richer checklist items (for Fyne-imported forms)
-- Adds multi-option "select" items and section grouping.
-- input_type gains 'select' (column is text, no enum change needed).
-- options: [{ "label": "...", "value": "...", "flag": true|false }]
--   flag=true means choosing that option raises a ticket.
-- =============================================================================

alter table public.checklist_items add column if not exists options jsonb;
alter table public.checklist_items add column if not exists section text;
