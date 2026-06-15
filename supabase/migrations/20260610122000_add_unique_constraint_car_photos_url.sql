-- Migration: add UNIQUE constraint on car_photos.url when existing data allows it.
-- Generated on 2026-06-10

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.car_photos'::regclass
      and conname = 'car_photos_url_unique'
  ) then
    return;
  end if;

  begin
    alter table public.car_photos
      add constraint car_photos_url_unique unique (url);
  exception
    when unique_violation then
      raise notice 'Skipping car_photos_url_unique because duplicate URLs already exist.';
    when duplicate_object then
      null;
  end;
end $$;
