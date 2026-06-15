-- Migration: set DEFAULT NULL for legacy factory_spec_confidence when present.
-- Generated on 2026-06-10
--
-- Some environments never had this column on car_catalog_versions. Keep this
-- migration safe so later storage/project migrations are not blocked.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'car_catalog_versions'
      and column_name = 'factory_spec_confidence'
  ) then
    execute 'alter table public.car_catalog_versions alter column factory_spec_confidence drop default';
    execute 'alter table public.car_catalog_versions alter column factory_spec_confidence set default null';
  end if;
end $$;
