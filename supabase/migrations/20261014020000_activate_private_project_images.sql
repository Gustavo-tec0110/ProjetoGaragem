-- BREAKING CUTOVER: only with maintenance, compatible app, cache purge and
-- owner's approval. Never revert this by setting public=true.
begin;
do $$ begin
  if to_regprocedure('public.can_read_project_image(text)') is null then
    raise exception 'Image access registry must be prepared first';
  end if;
  if not exists (select 1 from storage.buckets where id = 'project-images') then
    raise exception 'Existing project-images bucket missing; do not create an empty substitute';
  end if;
  if not exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname = 'objects' and c.relrowsecurity) then
    raise exception 'Storage RLS must already be enabled; inspect before cutover';
  end if;
end $$;

update storage.buckets set public = false where id = 'project-images';
drop policy if exists project_images_read_public on storage.objects;
drop policy if exists "Public read project images" on storage.objects;
-- Deny direct reads/signing and mutations even if a legacy permissive FOR ALL
-- policy exists. The server service role bypasses RLS after request authorization.
drop policy if exists project_images_server_only on storage.objects;
create policy project_images_server_only on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'project-images') with check (bucket_id <> 'project-images');

notify pgrst, 'reload schema';
commit;
