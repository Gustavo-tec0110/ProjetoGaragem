begin;
-- Keep the existing cover columns for compatibility with older clients.
alter table public.project_modifications add column photo_gallery jsonb not null default '{"paths":[],"crop":null}'::jsonb;
alter table public.project_modifications add constraint project_modifications_photo_gallery_check check (coalesce((
  jsonb_typeof(photo_gallery) = 'object' and jsonb_typeof(photo_gallery->'paths') = 'array'
  and jsonb_array_length(photo_gallery->'paths') <= 2
  and (jsonb_array_length(photo_gallery->'paths') = 0 or project_photo_storage_path is not null)
  and (photo_gallery->'crop' = 'null'::jsonb or (
    jsonb_typeof(photo_gallery->'crop') = 'object'
    and jsonb_typeof(photo_gallery->'crop'->'zoom') = 'number'
    and jsonb_typeof(photo_gallery->'crop'->'x') = 'number'
    and jsonb_typeof(photo_gallery->'crop'->'y') = 'number'
    and (photo_gallery->'crop'->>'zoom')::numeric between 1 and 4
    and (photo_gallery->'crop'->>'x')::numeric between -4 and 4
    and (photo_gallery->'crop'->>'y')::numeric between -4 and 4
  ))
), false));

-- Include each additional object in the existing ownership, privacy and deletion registry.
create or replace function public.project_image_row_paths(p_table text, p_row jsonb)
returns table(path text) language sql immutable set search_path = '' as $$
  select distinct public.project_image_reference_path(value)
  from jsonb_array_elements_text(case p_table
    when 'cars' then jsonb_build_array(p_row->>'main_photo_url') || coalesce(p_row->'photo_urls', '[]'::jsonb)
    when 'car_photos' then jsonb_build_array(p_row->>'url', p_row->>'storage_path')
    when 'car_parts' then jsonb_build_array(p_row->>'image_url', p_row->>'storage_path')
    when 'car_build_updates' then jsonb_build_array(p_row->>'photo_url') || coalesce(p_row->'photo_urls', '[]'::jsonb)
    when 'project_modifications' then jsonb_build_array(p_row->>'project_photo_url', p_row->>'project_photo_storage_path') || coalesce(p_row->'photo_gallery'->'paths', '[]'::jsonb)
    when 'profiles' then jsonb_build_array(p_row->>'avatar_url', p_row->>'cover_url')
    else '[]'::jsonb end) v(value)
  where public.project_image_reference_path(value) is not null;
$$;

-- Reject invalid gallery entries even for direct Data API writes.
create function public.validate_modification_gallery() returns trigger language plpgsql security definer set search_path = '' as $$
declare p jsonb; v text; seen text[] := array[]::text[];
begin
  for p in select value from jsonb_array_elements(new.photo_gallery->'paths') loop
    if jsonb_typeof(p) <> 'string' then raise exception 'Invalid photo path'; end if;
    v := p #>> '{}';
    if public.project_image_reference_path(v) is distinct from v or v = new.project_photo_storage_path or v = any(seen) then
      raise exception 'Invalid photo path';
    end if;
    seen := array_append(seen, v);
  end loop;
  return new;
end $$;
create trigger validate_modification_gallery before insert or update on public.project_modifications for each row execute function public.validate_modification_gallery();
revoke all on function public.validate_modification_gallery() from public, anon, authenticated;

drop function public.list_public_project_modifications(uuid);
create function public.list_public_project_modifications(p_car_id uuid)
returns table (id uuid, car_id uuid, catalog_id uuid, custom_name text, is_featured boolean, status text,
 paid_amount integer, public_description text, project_photo_url text, photo_gallery jsonb, installed_at date, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select m.id, m.car_id, m.catalog_id, m.custom_name, m.is_featured, m.status,
 case when m.show_paid_amount then m.paid_amount else null end, m.public_description,
 m.project_photo_url, m.photo_gallery, m.installed_at, m.created_at, m.updated_at
 from public.project_modifications m join public.cars c on c.id = m.car_id
 where m.car_id = p_car_id and c.is_public is true order by m.created_at desc;
$$;
revoke all on function public.list_public_project_modifications(uuid) from public;
grant execute on function public.list_public_project_modifications(uuid) to anon, authenticated;

drop function public.list_garage_highlights(uuid);
create function public.list_garage_highlights(p_owner_id uuid)
returns table (id uuid, project_slug text, project_name text, component_name text, photo_url text, photo_gallery jsonb)
language sql stable security definer set search_path = '' as $$
 select m.id, c.slug, c.name, coalesce(m.custom_name, catalog.name), coalesce(m.project_photo_url, catalog.default_image_path), m.photo_gallery
 from public.project_modifications m join public.cars c on c.id = m.car_id
 left join public.modification_catalog catalog on catalog.id = m.catalog_id
 where c.owner_id = p_owner_id and m.is_featured and (c.is_public is true or c.owner_id = auth.uid())
 order by m.created_at desc, m.id;
$$;
revoke all on function public.list_garage_highlights(uuid) from public;
grant execute on function public.list_garage_highlights(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
