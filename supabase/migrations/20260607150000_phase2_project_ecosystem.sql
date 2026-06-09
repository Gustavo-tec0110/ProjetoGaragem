begin;

-- Supabase Storage bucket for real project photos.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-images',
  'project-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_images_read_public" on storage.objects;
create policy "project_images_read_public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'project-images');

drop policy if exists "project_images_insert_own_folder" on storage.objects;
create policy "project_images_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_images_update_own_folder" on storage.objects;
create policy "project_images_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_images_delete_own_folder" on storage.objects;
create policy "project_images_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

alter table public.profiles
  add column if not exists is_likes_public boolean not null default false;

alter table public.cars
  add column if not exists show_expenses_public boolean not null default true;

alter table public.car_photos
  add column if not exists storage_path text,
  add column if not exists width integer,
  add column if not exists height integer;

alter table public.car_parts
  add column if not exists installed_at date,
  add column if not exists image_url text,
  add column if not exists storage_path text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.car_parts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
      and pg_get_constraintdef(oid) ilike '%installed%'
      and pg_get_constraintdef(oid) ilike '%planned%'
  loop
    execute format('alter table public.car_parts drop constraint if exists %I', constraint_name);
  end loop;

  if not exists (
    select 1 from pg_constraint where conname = 'car_parts_status_chk'
  ) then
    alter table public.car_parts
      add constraint car_parts_status_chk
      check (status in ('installed', 'planned', 'removed'));
  end if;
end $$;

alter table public.car_build_updates
  add column if not exists category text not null default 'outro',
  add column if not exists photo_urls text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'car_build_updates_category_chk'
  ) then
    alter table public.car_build_updates
      add constraint car_build_updates_category_chk
      check (
        category in (
          'manutencao',
          'estetica',
          'performance',
          'interior',
          'suspensao',
          'rodas',
          'motor',
          'eletrica',
          'outro'
        )
      );
  end if;
end $$;

alter table public.car_expenses
  add column if not exists note text,
  add column if not exists part_id uuid references public.car_parts(id) on delete set null,
  add column if not exists part_name text,
  add column if not exists is_public boolean not null default true;

do $$
begin
  alter table public.car_expenses drop constraint if exists car_expenses_category_chk;

  alter table public.car_expenses
    add constraint car_expenses_category_chk
    check (
      category in (
        'Motor',
        'Suspensao',
        'Suspensão',
        'Rodas',
        'Freios',
        'Estetica',
        'Estética',
        'Interior',
        'Som',
        'Eletrica',
        'Elétrica',
        'Outros'
      )
    );
end $$;

create index if not exists idx_car_build_updates_category
  on public.car_build_updates (category);
create index if not exists idx_car_expenses_public
  on public.car_expenses (car_id, is_public, spent_at desc);
create index if not exists idx_car_parts_status_category
  on public.car_parts (car_id, status, category);

drop policy if exists "car_expenses_read_public_or_owner" on public.car_expenses;
create policy "car_expenses_read_public_or_owner" on public.car_expenses
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id
      and (
        c.owner_id = auth.uid()
        or (c.is_public = true and c.show_expenses_public = true and is_public = true)
      )
  )
);

drop policy if exists "car_saves_read_own_or_public_owner" on public.car_saves;
create policy "car_saves_read_own_or_public_owner" on public.car_saves
for select to anon, authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = user_id and p.is_saves_public = true
  )
);

create or replace function public.increment_car_view(target_car_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
begin
  update public.cars
  set views_count = views_count + 1
  where id = target_car_id
    and is_public = true;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

grant execute on function public.increment_car_view(uuid) to anon, authenticated;

create or replace function public.refresh_profile_cars_count(profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set cars_count = (
    select count(*)::integer
    from public.cars c
    where c.owner_id = profile_id
  )
  where id = profile_id;
$$;

create or replace function public.sync_profile_cars_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_profile_cars_count(new.owner_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_profile_cars_count(old.owner_id);
    return old;
  elsif tg_op = 'UPDATE' and new.owner_id <> old.owner_id then
    perform public.refresh_profile_cars_count(old.owner_id);
    perform public.refresh_profile_cars_count(new.owner_id);
    return new;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_profile_cars_count on public.cars;
create trigger trg_profile_cars_count
after insert or update of owner_id or delete on public.cars
for each row execute function public.sync_profile_cars_count();

create or replace function public.sync_profile_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set following_count = following_count + 1
    where id = new.follower_id;

    update public.profiles
    set followers_count = followers_count + 1
    where id = new.following_id;

    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
    set following_count = greatest(following_count - 1, 0)
    where id = old.follower_id;

    update public.profiles
    set followers_count = greatest(followers_count - 1, 0)
    where id = old.following_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_profile_follow_counts on public.user_follows;
create trigger trg_profile_follow_counts
after insert or delete on public.user_follows
for each row execute function public.sync_profile_follow_counts();

grant select on public.car_expenses to anon, authenticated;
grant select on public.car_saves to anon, authenticated;
grant update on public.cars to authenticated;

notify pgrst, 'reload schema';

commit;
