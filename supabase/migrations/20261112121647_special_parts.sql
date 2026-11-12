begin;
alter table public.project_modifications alter column catalog_id drop not null;
alter table public.project_modifications
  add column custom_name text,
  add column is_featured boolean not null default false,
  add constraint project_modifications_component_chk check (
    (catalog_id is not null and custom_name is null) or
    (catalog_id is null and custom_name is not null and char_length(trim(custom_name)) between 2 and 120)
  );

-- Retain the existing owner-only table policies and expose only public fields.
drop function public.list_public_project_modifications(uuid);
create function public.list_public_project_modifications(p_car_id uuid)
returns table (id uuid, car_id uuid, catalog_id uuid, custom_name text, is_featured boolean, status text,
 paid_amount integer, public_description text, project_photo_url text, installed_at date, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select m.id, m.car_id, m.catalog_id, m.custom_name, m.is_featured, m.status,
 case when m.show_paid_amount then m.paid_amount else null end, m.public_description,
 m.project_photo_url, m.installed_at, m.created_at, m.updated_at
 from public.project_modifications m join public.cars c on c.id = m.car_id
 where m.car_id = p_car_id and c.is_public is true order by m.created_at desc;
$$;
revoke all on function public.list_public_project_modifications(uuid) from public;
grant execute on function public.list_public_project_modifications(uuid) to anon, authenticated;

create function public.list_garage_highlights(p_owner_id uuid)
returns table (id uuid, project_slug text, project_name text, component_name text, photo_url text)
language sql stable security definer set search_path = '' as $$
 select m.id, c.slug, c.name, coalesce(m.custom_name, catalog.name), coalesce(m.project_photo_url, catalog.default_image_path)
 from public.project_modifications m join public.cars c on c.id = m.car_id
 left join public.modification_catalog catalog on catalog.id = m.catalog_id
 where c.owner_id = p_owner_id and m.is_featured and (c.is_public is true or c.owner_id = auth.uid())
 order by m.created_at desc, m.id;
$$;
revoke all on function public.list_garage_highlights(uuid) from public;
grant execute on function public.list_garage_highlights(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
