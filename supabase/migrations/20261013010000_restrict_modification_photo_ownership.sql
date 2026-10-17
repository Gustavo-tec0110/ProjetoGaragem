-- A project owner may only persist a modification photo in their own folder.
-- Keep the existing ownership and rate-limit checks from the prior policies.
alter policy "project_modifications_insert_owner" on public.project_modifications
with check (
  public.enforce_action_rate_limit('project_update')
  and exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id and c.owner_id = auth.uid()
  )
  and (
    project_photo_storage_path is null
    or split_part(project_photo_storage_path, '/', 1) = auth.uid()::text
  )
);

alter policy "project_modifications_update_owner" on public.project_modifications
with check (
  public.enforce_action_rate_limit('project_update')
  and exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id and c.owner_id = auth.uid()
  )
  and (
    project_photo_storage_path is null
    or split_part(project_photo_storage_path, '/', 1) = auth.uid()::text
  )
);
