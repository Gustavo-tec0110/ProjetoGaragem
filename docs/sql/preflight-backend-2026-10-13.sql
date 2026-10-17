-- READ ONLY. Confirm Dashboard Project Ref hxqhudfzdwfxnjzmphya before running.
-- Save the result privately as the snapshot before any migration application.
select current_database(), current_user, version();

select version, name from supabase_migrations.schema_migrations order by version;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('cars','profiles','project_modifications','car_build_updates','car_expenses','pending_modification_photo_leases')
order by tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('cars','profiles','project_modifications','car_build_updates','car_expenses','modification_catalog','modification_categories','public_profiles','pending_modification_photo_leases')
order by table_name, grantee, privilege_type;

select c.relname, c.relrowsecurity, c.relforcerowsecurity, c.reloptions,
  pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in (
  'project_modifications','car_build_updates','public_profiles','pending_modification_photo_leases'
);

select p.oid::regprocedure, pg_get_userbyid(p.proowner) as owner,
  p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'save_car_project_atomic','list_public_project_modifications','list_public_car_build_updates','list_public_car_expenses',
  'touch_pending_modification_photo','inspect_stale_pending_modification_photos','claim_stale_pending_modification_photo','prune_pending_modification_photo_leases'
);

select pg_get_viewdef('public.public_profiles'::regclass, true) as public_profile_projection;
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'project-images';
select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.cars) as cars,
       (select count(*) from public.project_modifications) as modifications,
       (select count(*) from storage.objects where bucket_id='project-images') as storage_objects;
