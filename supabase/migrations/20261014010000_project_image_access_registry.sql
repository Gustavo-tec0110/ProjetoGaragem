-- Preparation only: does NOT change bucket visibility or delete/move objects.
begin;

create or replace function public.project_image_reference_path(p_value text)
returns text language plpgsql immutable set search_path = '' as $$
declare v_path text := p_value;
begin
  if p_value like '/api/media/project/%' then
    v_path := substr(p_value, length('/api/media/project/') + 1);
  elsif p_value ~ '^https?://[^/]+/storage/v1/object/public/project-images/' then
    v_path := regexp_replace(p_value, '^https?://[^/]+/storage/v1/object/public/project-images/', '');
  end if;
  if length(v_path) > 1024 or v_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/([a-z0-9_-]+/)+[a-z0-9_.-]+\.(webp|png|jpe?g)$'
    or v_path ~ '/\.' then return null; end if;
  return v_path;
end;
$$;

create or replace function public.project_image_row_paths(p_table text, p_row jsonb)
returns table(path text) language sql immutable set search_path = '' as $$
  select distinct public.project_image_reference_path(value)
  from jsonb_array_elements_text(case p_table
    when 'cars' then jsonb_build_array(p_row->>'main_photo_url') || coalesce(p_row->'photo_urls', '[]'::jsonb)
    when 'car_photos' then jsonb_build_array(p_row->>'url', p_row->>'storage_path')
    when 'car_parts' then jsonb_build_array(p_row->>'image_url', p_row->>'storage_path')
    when 'car_build_updates' then jsonb_build_array(p_row->>'photo_url') || coalesce(p_row->'photo_urls', '[]'::jsonb)
    when 'project_modifications' then jsonb_build_array(p_row->>'project_photo_url', p_row->>'project_photo_storage_path')
    when 'profiles' then jsonb_build_array(p_row->>'avatar_url', p_row->>'cover_url')
    else '[]'::jsonb end) v(value)
  where public.project_image_reference_path(value) is not null;
$$;

create table if not exists public.project_image_references (
  source_table text not null,
  source_id uuid not null,
  path text not null,
  owner_id uuid not null,
  car_id uuid references public.cars(id) on delete cascade,
  primary key (source_table, source_id, path)
);
create index if not exists project_image_references_path_idx on public.project_image_references(path);
create index if not exists project_image_references_car_idx on public.project_image_references(car_id);
alter table public.project_image_references enable row level security;
revoke all on public.project_image_references from public, anon, authenticated;

-- A failed Storage removal leaves a tombstone, never a path that another save
-- can attach while deletion is in flight. Recovery requires explicit inspection.
create table if not exists public.project_image_deletion_claims (
  path text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.project_image_deletion_claims enable row level security;
revoke all on public.project_image_deletion_claims from public, anon, authenticated;

create or replace function public.sync_project_image_references()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_id uuid;
  v_owner uuid;
  v_car uuid;
  v_path text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := (v_row->>'id')::uuid;
  if tg_table_name = 'profiles' then
    v_owner := v_id;
  elsif tg_table_name = 'cars' then
    v_car := v_id;
    v_owner := (v_row->>'owner_id')::uuid;
  else
    v_car := (v_row->>'car_id')::uuid;
    select owner_id into v_owner from public.cars where id = v_car;
  end if;

  -- Lock both old and new paths in a stable order, shared with deletion/leases.
  for v_path in select path from public.project_image_row_paths(tg_table_name, v_row)
    union select path from public.project_image_references where source_table = tg_table_name and source_id = v_id
    order by path
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_path, 0));
  end loop;
  if tg_op <> 'DELETE' then
    for v_path in select path from public.project_image_row_paths(tg_table_name, v_row) loop
      if split_part(v_path, '/', 1) <> v_owner::text then
        raise exception 'Image belongs to another account' using errcode = '42501';
      end if;
      if exists (select 1 from public.project_image_deletion_claims where path = v_path)
        or exists (select 1 from public.pending_modification_photo_leases where path = v_path and claimed_at is not null) then
        raise exception 'Image deletion already claimed' using errcode = '42501';
      end if;
      if not exists (select 1 from public.project_image_references where source_table = tg_table_name and source_id = v_id and path = v_path)
        and not exists (select 1 from storage.objects where bucket_id = 'project-images' and name = v_path) then
        raise exception 'Image object missing' using errcode = '42501';
      end if;
      -- Modification temporaries must be finalized by their upload workflow.
      if split_part(v_path, '/', 2) = 'pending-modifications' then
        raise exception 'Pending modification photo cannot be published' using errcode = '42501';
      end if;
    end loop;
  end if;
  delete from public.project_image_references where source_table = tg_table_name and source_id = v_id;
  if tg_op <> 'DELETE' then
    insert into public.project_image_references(source_table, source_id, path, owner_id, car_id)
      select tg_table_name, v_id, path, v_owner, v_car from public.project_image_row_paths(tg_table_name, v_row);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Lock writers during the complete backfill. Reapplication is deterministic.
lock table public.profiles, public.cars, public.car_photos, public.car_parts,
  public.car_build_updates, public.project_modifications in share row exclusive mode;
delete from public.project_image_references;
insert into public.project_image_references(source_table, source_id, path, owner_id, car_id)
select 'cars', c.id, p.path, c.owner_id, c.id from public.cars c
  cross join lateral public.project_image_row_paths('cars', to_jsonb(c)) p
union all
select 'profiles', c.id, p.path, c.id, null from public.profiles c
  cross join lateral public.project_image_row_paths('profiles', to_jsonb(c)) p
union all
select 'car_photos', r.id, p.path, c.owner_id, c.id from public.car_photos r join public.cars c on c.id = r.car_id
  cross join lateral public.project_image_row_paths('car_photos', to_jsonb(r)) p
union all
select 'car_parts', r.id, p.path, c.owner_id, c.id from public.car_parts r join public.cars c on c.id = r.car_id
  cross join lateral public.project_image_row_paths('car_parts', to_jsonb(r)) p
union all
select 'car_build_updates', r.id, p.path, c.owner_id, c.id from public.car_build_updates r join public.cars c on c.id = r.car_id
  cross join lateral public.project_image_row_paths('car_build_updates', to_jsonb(r)) p
union all
select 'project_modifications', r.id, p.path, c.owner_id, c.id from public.project_modifications r join public.cars c on c.id = r.car_id
  cross join lateral public.project_image_row_paths('project_modifications', to_jsonb(r)) p;

do $$ declare v_table text; begin
  foreach v_table in array array['profiles','cars','car_photos','car_parts','car_build_updates','project_modifications'] loop
    execute format('drop trigger if exists sync_project_images on public.%I', v_table);
    execute format('create trigger sync_project_images after insert or update or delete on public.%I for each row execute function public.sync_project_image_references()', v_table);
  end loop;
end $$;

create or replace function public.can_read_project_image(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.project_image_reference_path(p_path) = p_path
    and not exists (select 1 from public.project_image_deletion_claims where path = p_path)
    and not exists (select 1 from public.pending_modification_photo_leases where path = p_path and claimed_at is not null)
    and exists (select 1 from storage.objects where bucket_id = 'project-images' and name = p_path)
    and (
      split_part(p_path, '/', 1) = auth.uid()::text
      or (
        exists (select 1 from public.project_image_references r where r.path = p_path)
        -- A shared path becomes private if ANY project using it is private.
        and not exists (select 1 from public.project_image_references r left join public.cars c on c.id = r.car_id
          where r.path = p_path and (r.owner_id::text <> split_part(p_path, '/', 1)
            or (r.car_id is not null and (c.id is null or not c.is_public))))
      )
    ), false);
$$;
revoke all on function public.can_read_project_image(text) from public;
grant execute on function public.can_read_project_image(text) to anon, authenticated;

create or replace function public.claim_unreferenced_project_image(p_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.project_image_reference_path(p_path) is distinct from p_path
    or split_part(p_path, '/', 1) <> auth.uid()::text then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_path, 0));
  if exists (select 1 from public.project_image_references where path = p_path) then return false; end if;
  insert into public.project_image_deletion_claims(path) values (p_path) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.claim_unreferenced_project_image(text) from public;
grant execute on function public.claim_unreferenced_project_image(text) to authenticated;
revoke all on function public.project_image_reference_path(text), public.project_image_row_paths(text,jsonb),
  public.sync_project_image_references() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
