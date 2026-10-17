-- Read-only. Run manually only in the explicitly confirmed environment.
-- Results can contain private object paths; keep them out of public artifacts.
begin transaction read only;
select current_database(), current_user, now();
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'project-images';
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_catalog.pg_get_userbyid(c.relowner) as owner
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage' and c.relname = 'objects';
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_catalog.pg_policies where (schemaname = 'storage' and tablename = 'objects')
    or (schemaname = 'public' and tablename in ('cars','car_photos','car_parts','car_build_updates','project_modifications','profiles'))
  order by schemaname, tablename, policyname;
select name, metadata->>'size' as bytes, created_at, updated_at
  from storage.objects where bucket_id = 'project-images' order by name;
select version from supabase_migrations.schema_migrations order by version;
select p.proname, p.prosecdef, p.proconfig, p.proacl,
  md5(pg_catalog.pg_get_functiondef(p.oid)) as definition_hash
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (
    'save_car_project_atomic','list_public_project_modifications','list_public_car_build_updates',
    'list_public_car_expenses','touch_pending_modification_photo','claim_stale_pending_modification_photo',
    'can_read_project_image','claim_unreferenced_project_image','sync_project_image_references');

-- Export row references before migrations, without relying on new functions.
select 'cars' as source_table, id as source_id, owner_id, id as car_id,
  jsonb_build_object('main_photo_url',main_photo_url,'photo_urls',photo_urls) as image_fields from public.cars
union all
select 'car_photos',r.id,c.owner_id,c.id,jsonb_build_object('url',r.url,'storage_path',r.storage_path)
  from public.car_photos r join public.cars c on c.id=r.car_id
union all
select 'car_parts',r.id,c.owner_id,c.id,jsonb_build_object('image_url',r.image_url,'storage_path',r.storage_path)
  from public.car_parts r join public.cars c on c.id=r.car_id
union all
select 'car_build_updates',r.id,c.owner_id,c.id,jsonb_build_object('photo_url',r.photo_url,'photo_urls',r.photo_urls)
  from public.car_build_updates r join public.cars c on c.id=r.car_id
union all
select 'project_modifications',r.id,c.owner_id,c.id,jsonb_build_object('project_photo_url',r.project_photo_url,'project_photo_storage_path',r.project_photo_storage_path)
  from public.project_modifications r join public.cars c on c.id=r.car_id
union all
select 'profiles',id,id,null,jsonb_build_object('avatar_url',avatar_url,'cover_url',cover_url) from public.profiles;
rollback;
