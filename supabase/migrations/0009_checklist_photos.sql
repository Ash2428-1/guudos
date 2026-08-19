-- =============================================================================
-- 0009_checklist_photos.sql — storage for checklist photo items.
-- Private bucket; any authenticated org user can upload/read (refine to
-- location scoping later). Photos are referenced by path in
-- checklist_responses.value_text.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('checklist-photos', 'checklist-photos', false)
on conflict (id) do nothing;

drop policy if exists checklist_photos_read on storage.objects;
create policy checklist_photos_read on storage.objects for select
  to authenticated
  using (bucket_id = 'checklist-photos');

drop policy if exists checklist_photos_write on storage.objects;
create policy checklist_photos_write on storage.objects for insert
  to authenticated
  with check (bucket_id = 'checklist-photos');

drop policy if exists checklist_photos_update on storage.objects;
create policy checklist_photos_update on storage.objects for update
  to authenticated
  using (bucket_id = 'checklist-photos')
  with check (bucket_id = 'checklist-photos');
