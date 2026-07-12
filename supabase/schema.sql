-- Projeto Garagem MVP schema
-- Fonte canonica: perfis de usuario, paginas publicas de carros/projetos,
-- pecas, fotos e interacoes sociais simples.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp']::text[]
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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  state text,
  is_saves_public boolean not null default false,
  is_likes_public boolean not null default false,
  cars_count integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_chk check (username ~ '^[a-z0-9][a-z0-9_-]{2,23}$')
);

create table if not exists public.car_catalog_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  generation_name text,
  year_start integer not null,
  year_end integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_catalog_models_years_chk check (year_start between 1900 and 2100 and year_end between year_start and 2100),
  constraint car_catalog_models_unique unique (brand, model, generation_name, year_start, year_end)
);

create table if not exists public.car_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.car_catalog_models(id) on delete cascade,
  version text not null,
  year_start integer not null,
  year_end integer not null,
  engine_original text,
  induction_original text,
  power_hp integer,
  drivetrain text,
  transmission text,
  fuel_type text,
  notes text,
  is_estimated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_catalog_versions_years_chk check (year_start between 1900 and 2100 and year_end between year_start and 2100),
  constraint car_catalog_versions_unique unique (model_id, version, year_start, year_end)
);

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  brand text not null,
  model text not null,
  year integer not null,
  version text,
  catalog_version_id uuid references public.car_catalog_versions(id) on delete set null,
  version_confidence text not null default 'unknown',
  factory_spec_confidence text not null default 'estimated',
  factory_specs_note text,
  factory_engine text,
  factory_induction text,
  factory_power_cv integer,
  factory_transmission text,
  factory_drivetrain text,
  spec_confidence_percent integer not null default 20,
  original_engine_answer text not null default 'unknown',
  original_induction_answer text not null default 'unknown',
  current_induction text,
  original_color_answer text not null default 'unknown',
  original_wheels_answer text not null default 'unknown',
  original_interior_answer text not null default 'unknown',
  original_suspension_answer text not null default 'unknown',
  category text not null,
  state text,
  city text,
  description text,
  main_photo_url text,
  photo_urls text[] not null default '{}'::text[],
  engine text,
  power_cv integer,
  fuel_type text,
  transmission text,
  drivetrain text,
  suspension text,
  wheels text,
  tires text,
  brakes text,
  project_status text,
  progress_percent integer,
  mileage_km integer,
  torque_nm integer,
  weight_kg integer,
  started_at date,
  project_goal text,
  tags text[] not null default '{}'::text[],
  show_expenses_public boolean not null default true,
  is_public boolean not null default true,
  likes_count integer not null default 0,
  saves_count integer not null default 0,
  comments_count integer not null default 0,
  views_count integer not null default 0,
  project_followers_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cars_year_chk check (year between 1900 and extract(year from now())::integer + 1),
  constraint cars_version_confidence_chk check (version_confidence in ('confirmed', 'unknown', 'estimated')),
  constraint cars_factory_spec_confidence_chk check (factory_spec_confidence in ('confirmed', 'unknown', 'estimated')),
  constraint cars_spec_confidence_percent_chk check (spec_confidence_percent between 0 and 100),
  constraint cars_detail_answers_chk check (
    original_engine_answer in ('yes', 'no', 'unknown')
    and original_induction_answer in ('yes', 'no', 'unknown')
    and original_color_answer in ('yes', 'no', 'unknown')
    and original_wheels_answer in ('yes', 'no', 'unknown')
    and original_interior_answer in ('yes', 'no', 'unknown')
    and original_suspension_answer in ('yes', 'no', 'unknown')
  ),
  constraint cars_project_followers_count_chk check (project_followers_count >= 0),
  constraint cars_counts_chk check (
    likes_count >= 0 and saves_count >= 0 and comments_count >= 0 and views_count >= 0
  )
);

create table if not exists public.car_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  storage_path text,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.car_parts (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  name text not null,
  category text not null,
  brand text,
  description text,
  status text not null check (status in ('installed', 'planned', 'removed')),
  priority text,
  price_estimate integer,
  external_url text,
  affiliate_url text,
  store_name text,
  product_id text,
  installed_at date,
  image_url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_parts_price_chk check (price_estimate is null or price_estimate >= 0)
);

create table if not exists public.car_likes (
  car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (car_id, user_id)
);

create table if not exists public.car_saves (
  car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (car_id, user_id)
);

create table if not exists public.car_comments (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint car_comments_content_chk check (char_length(trim(content)) between 2 and 1000)
);

create table if not exists public.car_build_updates (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  photo_urls text[] not null default '{}'::text[],
  category text not null default 'outro',
  happened_at date not null default current_date,
  amount_spent integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_build_updates_title_chk check (char_length(trim(title)) between 3 and 160),
  constraint car_build_updates_amount_chk check (amount_spent is null or amount_spent >= 0),
  constraint car_build_updates_category_chk check (
    category in ('manutencao', 'estetica', 'performance', 'interior', 'suspensao', 'rodas', 'motor', 'eletrica', 'compra', 'antes_depois', 'outro')
  )
);

create table if not exists public.car_expenses (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  name text not null,
  category text not null,
  amount integer not null,
  spent_at date not null default current_date,
  note text,
  part_id uuid references public.car_parts(id) on delete set null,
  part_name text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_expenses_name_chk check (char_length(trim(name)) between 2 and 160),
  constraint car_expenses_amount_chk check (amount >= 0),
  constraint car_expenses_category_chk check (
    category in ('Motor', 'Suspensao', 'Suspensão', 'Rodas', 'Freios', 'Estetica', 'Estética', 'Interior', 'Som', 'Eletrica', 'Elétrica', 'Outros')
  )
);

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_chk check (follower_id <> following_id)
);

create table if not exists public.project_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_follows_unique unique (user_id, car_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid generated always as (user_id) stored,
  actor_id uuid references public.profiles(id) on delete set null,
  car_id uuid references public.cars(id) on delete cascade,
  project_id uuid,
  type text not null,
  title text not null,
  body text,
  message text generated always as (body) stored,
  href text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_chk check (
    type in ('follow', 'project_comment', 'project_like', 'project_save', 'project_follow', 'project_update')
  )
);

create table if not exists public.part_requirements (
  id uuid primary key default gen_random_uuid(),
  part_category text not null,
  required_category text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_car_catalog_models_lookup on public.car_catalog_models (brand, model, year_start, year_end);
create index if not exists idx_car_catalog_versions_model_year on public.car_catalog_versions (model_id, year_start, year_end);
create index if not exists idx_cars_owner_id on public.cars (owner_id);
create index if not exists idx_cars_slug on public.cars (slug);
create index if not exists idx_cars_public_recent on public.cars (is_public, created_at desc);
create index if not exists idx_cars_brand_model on public.cars (brand, model);
create index if not exists idx_cars_catalog_version_id on public.cars (catalog_version_id);
create index if not exists idx_cars_category on public.cars (category);
create index if not exists idx_cars_project_followers_count on public.cars (project_followers_count desc);
create index if not exists idx_cars_state on public.cars (state);
create index if not exists idx_cars_project_status on public.cars (project_status);
create index if not exists idx_cars_started_at on public.cars (started_at desc);
create index if not exists idx_cars_tags on public.cars using gin (tags);
create index if not exists idx_car_parts_car_id on public.car_parts (car_id);
create index if not exists idx_car_parts_status_category on public.car_parts (car_id, status, category);
create index if not exists idx_car_photos_car_id on public.car_photos (car_id);
create index if not exists idx_car_comments_car_id on public.car_comments (car_id, created_at desc);
create index if not exists idx_car_likes_user_id on public.car_likes (user_id);
create index if not exists idx_car_saves_user_id on public.car_saves (user_id);
create index if not exists idx_car_build_updates_car_id on public.car_build_updates (car_id, happened_at desc);
create index if not exists idx_car_build_updates_category on public.car_build_updates (category);
create index if not exists idx_car_expenses_car_id on public.car_expenses (car_id, spent_at desc);
create index if not exists idx_car_expenses_public on public.car_expenses (car_id, is_public, spent_at desc);
create index if not exists idx_project_follows_car_id on public.project_follows (car_id, created_at desc);
create index if not exists idx_project_follows_user_id on public.project_follows (user_id, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications (user_id, read_at, created_at desc);
create index if not exists idx_notifications_car_id on public.notifications (car_id, created_at desc);
create index if not exists idx_notifications_project_id on public.notifications (project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.profile_username_from_auth_user(
  user_id uuid,
  email text,
  metadata jsonb
)
returns citext
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  base_username text;
  candidate text;
  counter integer := 0;
begin
  raw_name := coalesce(
    nullif(metadata->>'preferred_username', ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    nullif(metadata->>'full_name', ''),
    nullif(metadata->>'name', ''),
    'membro'
  );

  base_username := lower(regexp_replace(raw_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_username := regexp_replace(base_username, '^-+|-+$', '', 'g');

  if base_username = '' then
    base_username := 'membro';
  end if;

  if length(base_username) < 3 then
    base_username := rpad(base_username, 3, '0');
  end if;

  base_username := left(base_username, 16);
  candidate := left(
    base_username || '-' || left(replace(user_id::text, '-', ''), 6),
    24
  );

  while exists (
    select 1
    from public.profiles p
    where p.username = candidate
      and p.id <> user_id
  ) loop
    counter := counter + 1;
    candidate := left(base_username, greatest(3, 23 - length(counter::text))) || '-' || counter::text;
    candidate := left(candidate, 24);
  end loop;

  return candidate::citext;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_full_name text := coalesce(
    nullif(metadata->>'full_name', ''),
    nullif(metadata->>'name', '')
  );
  resolved_avatar_url text := coalesce(
    nullif(metadata->>'avatar_url', ''),
    nullif(metadata->>'picture', '')
  );
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    email,
    full_name,
    avatar_url
  )
  values (
    new.id,
    public.profile_username_from_auth_user(new.id, new.email, metadata),
    coalesce(resolved_full_name, new.email, 'Membro Projeto Garagem'),
    new.email,
    resolved_full_name,
    resolved_avatar_url
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_cars_updated_at on public.cars;
create trigger trg_cars_updated_at
before update on public.cars
for each row execute function public.set_updated_at();

drop trigger if exists trg_car_parts_updated_at on public.car_parts;
create trigger trg_car_parts_updated_at
before update on public.car_parts
for each row execute function public.set_updated_at();

drop trigger if exists trg_car_build_updates_updated_at on public.car_build_updates;
create trigger trg_car_build_updates_updated_at
before update on public.car_build_updates
for each row execute function public.set_updated_at();

drop trigger if exists trg_car_expenses_updated_at on public.car_expenses;
create trigger trg_car_expenses_updated_at
before update on public.car_expenses
for each row execute function public.set_updated_at();

create or replace function public.bump_car_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.cars set likes_count = likes_count + 1 where id = new.car_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.cars set likes_count = greatest(likes_count - 1, 0) where id = old.car_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_car_likes_count on public.car_likes;
create trigger trg_car_likes_count
after insert or delete on public.car_likes
for each row execute function public.bump_car_like_count();

create or replace function public.bump_car_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.cars set saves_count = saves_count + 1 where id = new.car_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.cars set saves_count = greatest(saves_count - 1, 0) where id = old.car_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_car_saves_count on public.car_saves;
create trigger trg_car_saves_count
after insert or delete on public.car_saves
for each row execute function public.bump_car_save_count();

create or replace function public.bump_car_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.cars set comments_count = comments_count + 1 where id = new.car_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.cars set comments_count = greatest(comments_count - 1, 0) where id = old.car_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_car_comments_count on public.car_comments;
create trigger trg_car_comments_count
after insert or delete on public.car_comments
for each row execute function public.bump_car_comment_count();

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

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_notification_type text,
  p_car_id uuid default null,
  p_notification_title text default null,
  p_notification_body text default null,
  p_dedupe boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_existing_id uuid;
  v_inserted_id uuid;
begin
  if v_actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_recipient_id is null or p_recipient_id = v_actor_id then
    return null;
  end if;

  if p_notification_type not in (
    'follow',
    'project_comment',
    'project_like',
    'project_save',
    'project_follow',
    'project_update'
  ) then
    raise exception 'invalid_notification_type';
  end if;

  if coalesce(trim(p_notification_title), '') = '' then
    raise exception 'notification_title_required';
  end if;

  if p_dedupe then
    select n.id
    into v_existing_id
    from public.notifications as n
    where n.user_id = p_recipient_id
      and n.actor_id = v_actor_id
      and n.type = p_notification_type
      and n.car_id is not distinct from p_car_id
    order by n.created_at desc
    limit 1;

    if v_existing_id is not null then
      update public.notifications as n
      set
        title = p_notification_title,
        body = p_notification_body,
        href = null,
        url = null,
        read_at = null,
        created_at = now()
      where n.id = v_existing_id;

      return v_existing_id;
    end if;
  end if;

  insert into public.notifications (
    user_id,
    actor_id,
    car_id,
    type,
    title,
    body
  )
  values (
    p_recipient_id,
    v_actor_id,
    p_car_id,
    p_notification_type,
    p_notification_title,
    p_notification_body
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

create or replace function public.refresh_project_followers_count(target_car_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cars
  set project_followers_count = (
    select count(*)::integer
    from public.project_follows pf
    where pf.car_id = target_car_id
  )
  where id = target_car_id;
$$;

create or replace function public.sync_project_followers_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_project_followers_count(new.car_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_project_followers_count(old.car_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_project_followers_count on public.project_follows;
create trigger trg_project_followers_count
after insert or delete on public.project_follows
for each row execute function public.sync_project_followers_count();

alter table public.profiles enable row level security;
alter table public.car_catalog_models enable row level security;
alter table public.car_catalog_versions enable row level security;
alter table public.cars enable row level security;
alter table public.car_photos enable row level security;
alter table public.car_parts enable row level security;
alter table public.car_likes enable row level security;
alter table public.car_saves enable row level security;
alter table public.car_comments enable row level security;
alter table public.car_build_updates enable row level security;
alter table public.car_expenses enable row level security;
alter table public.user_follows enable row level security;
alter table public.project_follows enable row level security;
alter table public.notifications enable row level security;
alter table public.part_requirements enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
for select to anon, authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "car_catalog_models_read_all" on public.car_catalog_models;
create policy "car_catalog_models_read_all" on public.car_catalog_models
for select to anon, authenticated using (true);

drop policy if exists "car_catalog_versions_read_all" on public.car_catalog_versions;
create policy "car_catalog_versions_read_all" on public.car_catalog_versions
for select to anon, authenticated using (true);

drop policy if exists "cars_read_public_or_owner" on public.cars;
create policy "cars_read_public_or_owner" on public.cars
for select to anon, authenticated using (is_public = true or owner_id = auth.uid());

drop policy if exists "cars_insert_own" on public.cars;
create policy "cars_insert_own" on public.cars
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "cars_update_own" on public.cars;
create policy "cars_update_own" on public.cars
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "cars_delete_own" on public.cars;
create policy "cars_delete_own" on public.cars
for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "car_photos_read_public_or_owner" on public.car_photos;
create policy "car_photos_read_public_or_owner" on public.car_photos
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_photos_write_owner" on public.car_photos;
create policy "car_photos_write_owner" on public.car_photos
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "car_parts_read_public_or_owner" on public.car_parts;
create policy "car_parts_read_public_or_owner" on public.car_parts
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_parts_write_owner" on public.car_parts;
create policy "car_parts_write_owner" on public.car_parts
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "car_likes_read_all" on public.car_likes;
create policy "car_likes_read_all" on public.car_likes
for select to anon, authenticated using (true);

drop policy if exists "car_likes_insert_own" on public.car_likes;
create policy "car_likes_insert_own" on public.car_likes
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "car_likes_delete_own" on public.car_likes;
create policy "car_likes_delete_own" on public.car_likes
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "car_saves_read_own_or_public_owner" on public.car_saves;
create policy "car_saves_read_own_or_public_owner" on public.car_saves
for select to anon, authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = user_id and p.is_saves_public = true
  )
);

drop policy if exists "car_saves_insert_own" on public.car_saves;
create policy "car_saves_insert_own" on public.car_saves
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "car_saves_delete_own" on public.car_saves;
create policy "car_saves_delete_own" on public.car_saves
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "car_comments_read_all" on public.car_comments;
create policy "car_comments_read_all" on public.car_comments
for select to anon, authenticated using (true);

drop policy if exists "car_comments_insert_own" on public.car_comments;
create policy "car_comments_insert_own" on public.car_comments
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "car_comments_delete_author" on public.car_comments;
create policy "car_comments_delete_author" on public.car_comments
for delete to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "car_build_updates_read_public_or_owner" on public.car_build_updates;
create policy "car_build_updates_read_public_or_owner" on public.car_build_updates
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_build_updates_write_owner" on public.car_build_updates;
create policy "car_build_updates_write_owner" on public.car_build_updates
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

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

drop policy if exists "car_expenses_write_owner" on public.car_expenses;
create policy "car_expenses_write_owner" on public.car_expenses
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "user_follows_read_all" on public.user_follows;
create policy "user_follows_read_all" on public.user_follows
for select to anon, authenticated using (true);

drop policy if exists "user_follows_insert_own" on public.user_follows;
create policy "user_follows_insert_own" on public.user_follows
for insert to authenticated with check (follower_id = auth.uid());

drop policy if exists "user_follows_delete_own" on public.user_follows;
create policy "user_follows_delete_own" on public.user_follows
for delete to authenticated using (follower_id = auth.uid());

drop policy if exists "project_follows_read_all" on public.project_follows;
create policy "project_follows_read_all" on public.project_follows
for select to anon, authenticated using (true);

drop policy if exists "project_follows_insert_own" on public.project_follows;
create policy "project_follows_insert_own" on public.project_follows
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "project_follows_delete_own" on public.project_follows;
create policy "project_follows_delete_own" on public.project_follows
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "part_requirements_read_all" on public.part_requirements;
create policy "part_requirements_read_all" on public.part_requirements
for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;

grant select on
  public.profiles,
  public.car_catalog_models,
  public.car_catalog_versions,
  public.cars,
  public.car_photos,
  public.car_parts,
  public.car_likes,
  public.car_comments,
  public.car_build_updates,
  public.car_expenses,
  public.user_follows,
  public.project_follows,
  public.part_requirements
to anon, authenticated;

grant select on public.car_saves to anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant insert, update on public.profiles to authenticated;

grant insert, update, delete on
  public.cars,
  public.car_photos,
  public.car_parts,
  public.car_build_updates,
  public.car_expenses
to authenticated;

grant insert, delete on
  public.car_likes,
  public.car_saves,
  public.car_comments,
  public.user_follows,
  public.project_follows
to authenticated;

grant execute on function public.increment_car_view(uuid) to anon, authenticated;
grant execute on function public.create_notification(uuid, text, uuid, text, text, boolean) to authenticated;
grant execute on function public.refresh_project_followers_count(uuid) to authenticated;

with model_seed (brand, model, generation_name, year_start, year_end, notes) as (
  values
    ('Volkswagen', 'Gol', 'Quadrado', 1980, 1994, 'Dados iniciais aproximados para orientar cadastro; podem variar por mercado e configuracao.'),
    ('Fiat', 'Uno', 'Primeira geracao', 1984, 2013, 'Dados iniciais aproximados; versoes populares variam por ano e combustivel.'),
    ('Chevrolet', 'Opala', 'Nacional', 1968, 1992, 'Dados iniciais aproximados para versoes conhecidas; consultar documentacao do veiculo.'),
    ('Chevrolet', 'Kadett', 'Nacional', 1989, 1998, 'Dados iniciais aproximados; alguns motores e injecoes mudaram por ano.'),
    ('Chevrolet', 'Chevette', 'Nacional', 1973, 1993, 'Dados iniciais aproximados; potencia e carburacao variam por ano.')
)
insert into public.car_catalog_models (brand, model, generation_name, year_start, year_end, notes)
select brand, model, generation_name, year_start, year_end, notes
from model_seed
on conflict (brand, model, generation_name, year_start, year_end) do update set
  notes = excluded.notes,
  updated_at = now();

with version_seed (
  brand,
  model,
  generation_name,
  version,
  year_start,
  year_end,
  engine_original,
  induction_original,
  power_hp,
  drivetrain,
  transmission,
  fuel_type,
  notes,
  is_estimated
) as (
  values
    ('Volkswagen', 'Gol', 'Quadrado', 'CL', 1991, 1994, 'AP 1.6 ou AP 1.8 dependendo da configuracao', 'Carburador', 86, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Referencia aproximada; motorizacao pode variar por ano e mercado.', true),
    ('Volkswagen', 'Gol', 'Quadrado', 'GL', 1991, 1994, 'AP 1.8', 'Carburador', 95, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Referencia aproximada; conferir documento e plaqueta do veiculo.', true),
    ('Volkswagen', 'Gol', 'Quadrado', 'GTS', 1987, 1994, 'AP 1.8', 'Carburador', 99, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados para Gol GTS de fim de serie.', true),
    ('Volkswagen', 'Gol', 'Quadrado', 'GTI', 1989, 1994, 'AP 2.0', 'Injecao eletronica', 120, 'Dianteira', 'Manual', 'Gasolina', 'Dados aproximados; conferir ano/modelo exato.', true),
    ('Fiat', 'Uno', 'Primeira geracao', 'Mille', 1990, 1996, 'Fiasa 1.0', 'Carburador', 48, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados de Uno Mille inicial.', true),
    ('Fiat', 'Uno', 'Primeira geracao', 'CS', 1984, 1994, 'Fiasa 1.3 ou 1.5 dependendo do ano', 'Carburador', 71, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados variam bastante por ano e mercado.', true),
    ('Fiat', 'Uno', 'Primeira geracao', '1.5R', 1987, 1989, 'Fiasa 1.5', 'Carburador', 86, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Referencia aproximada para versao esportiva.', true),
    ('Chevrolet', 'Opala', 'Nacional', 'Especial', 1969, 1979, '4 cilindros 2.5 ou 6 cilindros 3.8/4.1', 'Carburador', 80, 'Traseira', 'Manual', 'Gasolina/alcool', 'Dados muito dependentes de ano e motor.', true),
    ('Chevrolet', 'Opala', 'Nacional', 'Comodoro', 1975, 1992, '4.1 seis cilindros ou 2.5 quatro cilindros', 'Carburador', 121, 'Traseira', 'Manual/automatico', 'Gasolina/alcool', 'Referencia aproximada; confirmar motor original.', true),
    ('Chevrolet', 'Opala', 'Nacional', 'Diplomata', 1980, 1992, '4.1 seis cilindros', 'Carburador', 121, 'Traseira', 'Manual/automatico', 'Gasolina/alcool', 'Referencia aproximada para modelos de luxo.', true),
    ('Chevrolet', 'Kadett', 'Nacional', 'SL', 1989, 1993, '1.8', 'Carburador', 95, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados.', true),
    ('Chevrolet', 'Kadett', 'Nacional', 'GL', 1994, 1998, '1.8 ou 2.0 dependendo do ano', 'Injecao eletronica', 110, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados; conferir ano exato.', true),
    ('Chevrolet', 'Kadett', 'Nacional', 'GSi', 1991, 1995, '2.0', 'Injecao eletronica', 121, 'Dianteira', 'Manual', 'Gasolina', 'Referencia aproximada para GSi.', true),
    ('Chevrolet', 'Chevette', 'Nacional', 'SL', 1978, 1993, '1.4 ou 1.6 dependendo do ano', 'Carburador', 68, 'Traseira', 'Manual', 'Gasolina/alcool', 'Dados aproximados.', true),
    ('Chevrolet', 'Chevette', 'Nacional', 'SE', 1987, 1993, '1.6/S', 'Carburador', 73, 'Traseira', 'Manual', 'Gasolina/alcool', 'Dados aproximados; conferir configuracao.', true),
    ('Chevrolet', 'Chevette', 'Nacional', 'GP/SR', 1976, 1981, '1.4', 'Carburador', 69, 'Traseira', 'Manual', 'Gasolina', 'Referencia aproximada para versoes esportivas antigas.', true)
)
insert into public.car_catalog_versions (
  model_id,
  version,
  year_start,
  year_end,
  engine_original,
  induction_original,
  power_hp,
  drivetrain,
  transmission,
  fuel_type,
  notes,
  is_estimated
)
select
  m.id,
  v.version,
  v.year_start,
  v.year_end,
  v.engine_original,
  v.induction_original,
  v.power_hp,
  v.drivetrain,
  v.transmission,
  v.fuel_type,
  v.notes,
  v.is_estimated
from version_seed v
join public.car_catalog_models m
  on m.brand = v.brand
  and m.model = v.model
  and m.generation_name = v.generation_name
on conflict (model_id, version, year_start, year_end) do update set
  engine_original = excluded.engine_original,
  induction_original = excluded.induction_original,
  power_hp = excluded.power_hp,
  drivetrain = excluded.drivetrain,
  transmission = excluded.transmission,
  fuel_type = excluded.fuel_type,
  notes = excluded.notes,
  is_estimated = excluded.is_estimated,
  updated_at = now();

insert into public.part_requirements (part_category, required_category, message)
values
  ('Turbo', 'Intercooler', 'Projetos turbo geralmente pedem intercooler, alimentacao, acerto e embreagem.'),
  ('Turbo', 'Alimentacao', 'Verifique bomba, bicos e linha de combustivel antes de subir pressao.'),
  ('Turbo', 'Eletronica', 'Acerto/injecao e wideband reduzem risco em projeto turbo.'),
  ('Suspensao', 'Pneus', 'Mudancas de altura pedem revisao de pneus, alinhamento e geometria.'),
  ('Freios', 'Pneus', 'Upgrade de freio rende mais quando pneus e rodas acompanham o conjunto.')
on conflict do nothing;

commit;

-- Canonical reconciliation block.
-- Keep this block last so fresh schema installs finish with the same hardened
-- state as the latest production migration.

begin;

set local search_path = public, extensions;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

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
  array['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read project images" on storage.objects;
drop policy if exists "Authenticated users can upload own project images" on storage.objects;
drop policy if exists "Authenticated users can update own project images" on storage.objects;
drop policy if exists "Authenticated users can delete own project images" on storage.objects;

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

alter table public.part_requirements
  add column if not exists deleted_at timestamptz default null;

create index if not exists idx_cars_tags_gin
  on public.cars using gin (tags);
create index if not exists idx_cars_name_trgm
  on public.cars using gin (lower(name) gin_trgm_ops);
create index if not exists idx_cars_brand_trgm
  on public.cars using gin (lower(brand) gin_trgm_ops);
create index if not exists idx_cars_model_trgm
  on public.cars using gin (lower(model) gin_trgm_ops);
create index if not exists idx_cars_engine_trgm
  on public.cars using gin (lower(coalesce(engine, '')) gin_trgm_ops);
create index if not exists idx_cars_description_trgm
  on public.cars using gin (lower(coalesce(description, '')) gin_trgm_ops);

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

  if exists (
    select 1
    from public.car_photos
    group by url
    having count(*) > 1
  ) then
    raise notice 'Skipping car_photos_url_unique because duplicate URLs already exist.';
    return;
  end if;

  alter table public.car_photos
    add constraint car_photos_url_unique unique (url);
end $$;

create or replace function public.project_normalize_text(value text)
returns text
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select trim(
    regexp_replace(
      lower(extensions.unaccent(coalesce(value, ''))),
      '[^a-z0-9#]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.project_search_text(target public.cars)
returns text
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select public.project_normalize_text(
    concat_ws(
      ' ',
      target.name,
      target.brand,
      target.model,
      target.year::text,
      target.version,
      target.engine,
      target.factory_engine,
      target.current_induction,
      target.fuel_type,
      target.category,
      target.description,
      target.project_goal,
      array_to_string(coalesce(target.tags, '{}'::text[]), ' ')
    )
  );
$$;

create or replace function public.search_car_projects(
  p_query text default '',
  p_category text default null,
  p_engine text default null,
  p_tag text default null,
  p_limit integer default 120
)
returns table(car_id uuid, rank numeric)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with normalized as (
    select
      public.project_normalize_text(p_query) as query,
      public.project_normalize_text(p_category) as category_filter,
      public.project_normalize_text(p_engine) as engine_filter,
      regexp_replace(public.project_normalize_text(p_tag), '^#+', '') as tag_filter,
      greatest(1, least(coalesce(p_limit, 120), 120)) as result_limit
  ),
  terms as (
    select regexp_split_to_table(query, '\s+') as term
    from normalized
    where query <> ''
  ),
  scored as (
    select
      c.id as car_id,
      (
        case when n.query <> '' and public.project_normalize_text(c.name) = n.query then 120 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.model) = n.query then 100 else 0 end +
        case when n.query <> '' and exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where regexp_replace(public.project_normalize_text(tag), '^#+', '') = regexp_replace(n.query, '^#+', '')
        ) then 100 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.name) like '%' || n.query || '%' then 40 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.model) like '%' || n.query || '%' then 36 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.brand) like '%' || n.query || '%' then 28 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.engine) like '%' || n.query || '%' then 26 else 0 end +
        case when n.query <> '' and exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where regexp_replace(public.project_normalize_text(tag), '^#+', '') like '%' || regexp_replace(n.query, '^#+', '') || '%'
        ) then 34 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.description) like '%' || n.query || '%' then 10 else 0 end +
        c.project_followers_count * 0.4 +
        c.likes_count * 0.3 +
        c.views_count * 0.02
      )::numeric as rank
    from public.cars c
    cross join normalized n
    where c.is_public = true
      and (n.category_filter = '' or public.project_normalize_text(c.category) = n.category_filter)
      and (n.engine_filter = '' or public.project_normalize_text(c.engine) like '%' || n.engine_filter || '%')
      and (
        n.tag_filter = ''
        or exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where regexp_replace(public.project_normalize_text(tag), '^#+', '') like '%' || n.tag_filter || '%'
        )
      )
      and (
        n.query = ''
        or not exists (
          select 1
          from terms t
          where public.project_search_text(c) not like '%' || t.term || '%'
        )
      )
  )
  select scored.car_id, scored.rank
  from scored
  cross join normalized n
  order by
    case when n.query = '' then 0 else scored.rank end desc,
    scored.rank desc,
    scored.car_id
  limit (select result_limit from normalized);
$$;

create or replace function public.suggest_car_project_terms(
  p_query text,
  p_limit integer default 8
)
returns table(term text, source text, rank integer)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with normalized as (
    select public.project_normalize_text(p_query) as query, greatest(1, least(coalesce(p_limit, 8), 12)) as result_limit
  ),
  candidates as (
    select brand as term, 'Marca' as source, 80 as base_rank from public.cars where is_public
    union all select model, 'Modelo', 78 from public.cars where is_public
    union all select name, 'Projeto', 74 from public.cars where is_public
    union all select coalesce(engine, ''), 'Motor', 68 from public.cars where is_public and coalesce(engine, '') <> ''
    union all select category, 'Estilo', 72 from public.cars where is_public and coalesce(category, '') <> ''
    union all
    select regexp_replace(tag, '^#+', ''), 'Tag', 76
    from public.cars, unnest(coalesce(tags, '{}'::text[])) tag
    where is_public and tag <> ''
  ),
  filtered as (
    select
      initcap(trim(term)) as term,
      source,
      max(base_rank + case when public.project_normalize_text(term) like (select query from normalized) || '%' then 20 else 0 end) as rank
    from candidates, normalized
    where normalized.query <> ''
      and public.project_normalize_text(term) like '%' || normalized.query || '%'
    group by initcap(trim(term)), source
  )
  select term, source, rank
  from filtered
  where term <> ''
  order by rank desc, length(term), term
  limit (select result_limit from normalized);
$$;

alter table public.profiles
  add column if not exists instagram_handle text,
  add column if not exists is_likes_public boolean not null default false;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  case
    when position('@' in display_name) > 1 then username::text
    else display_name
  end as display_name,
  avatar_url,
  bio,
  city,
  state,
  instagram_handle,
  is_saves_public,
  is_likes_public,
  cars_count,
  followers_count,
  following_count,
  created_at,
  updated_at
from public.profiles;

comment on view public.public_profiles is
  'Public-safe profile projection. Excludes email and full_name; use public.profiles only for the authenticated user own row.';

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.car_comments enable row level security;

drop policy if exists "car_comments_read_all" on public.car_comments;
drop policy if exists "car_comments_read_visible" on public.car_comments;
create policy "car_comments_read_visible" on public.car_comments
for select to anon, authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.cars c
    where c.id = car_comments.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_comments_insert_own" on public.car_comments;
create policy "car_comments_insert_own" on public.car_comments
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = car_comments.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_comments_delete_author" on public.car_comments;
create policy "car_comments_delete_author" on public.car_comments
for delete to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.cars c
    where c.id = car_comments.car_id
      and c.owner_id = auth.uid()
  )
);

alter table public.car_likes enable row level security;

drop policy if exists "car_likes_read_all" on public.car_likes;
drop policy if exists "car_likes_read_own_or_public_profile" on public.car_likes;
create policy "car_likes_read_own_or_public_profile" on public.car_likes
for select to anon, authenticated using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.profiles p
      where p.id = car_likes.user_id
        and p.is_likes_public = true
    )
    and exists (
      select 1
      from public.cars c
      where c.id = car_likes.car_id
        and c.is_public = true
    )
  )
);

drop policy if exists "car_likes_insert_own" on public.car_likes;
create policy "car_likes_insert_own" on public.car_likes
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = car_likes.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_likes_delete_own" on public.car_likes;
create policy "car_likes_delete_own" on public.car_likes
for delete to authenticated using (user_id = auth.uid());

alter table public.car_saves enable row level security;

drop policy if exists "car_saves_read_own_or_public_owner" on public.car_saves;
drop policy if exists "car_saves_read_own_or_public_profile" on public.car_saves;
create policy "car_saves_read_own_or_public_profile" on public.car_saves
for select to anon, authenticated using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.profiles p
      where p.id = car_saves.user_id
        and p.is_saves_public = true
    )
    and exists (
      select 1
      from public.cars c
      where c.id = car_saves.car_id
        and c.is_public = true
    )
  )
);

drop policy if exists "car_saves_insert_own" on public.car_saves;
create policy "car_saves_insert_own" on public.car_saves
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = car_saves.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_saves_delete_own" on public.car_saves;
create policy "car_saves_delete_own" on public.car_saves
for delete to authenticated using (user_id = auth.uid());

alter table public.user_follows enable row level security;

drop policy if exists "user_follows_read_all" on public.user_follows;
drop policy if exists "user_follows_read_related" on public.user_follows;
create policy "user_follows_read_related" on public.user_follows
for select to authenticated using (
  follower_id = auth.uid()
  or following_id = auth.uid()
);

drop policy if exists "user_follows_insert_own" on public.user_follows;
create policy "user_follows_insert_own" on public.user_follows
for insert to authenticated with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
);

drop policy if exists "user_follows_delete_own" on public.user_follows;
create policy "user_follows_delete_own" on public.user_follows
for delete to authenticated using (follower_id = auth.uid());

alter table public.project_follows enable row level security;

drop policy if exists "project_follows_read_all" on public.project_follows;
drop policy if exists "project_follows_read_own_or_project_owner" on public.project_follows;
create policy "project_follows_read_own_or_project_owner" on public.project_follows
for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.cars c
    where c.id = project_follows.car_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "project_follows_insert_own" on public.project_follows;
create policy "project_follows_insert_own" on public.project_follows
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = project_follows.car_id
      and c.is_public = true
      and c.owner_id <> auth.uid()
  )
);

drop policy if exists "project_follows_delete_own" on public.project_follows;
create policy "project_follows_delete_own" on public.project_follows
for delete to authenticated using (user_id = auth.uid());

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_system" on public.notifications;

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_notification_type text,
  p_car_id uuid default null,
  p_notification_title text default null,
  p_notification_body text default null,
  p_dedupe boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_existing_id uuid;
  v_inserted_id uuid;
  v_should_dedupe boolean := coalesce(p_dedupe, true) or p_notification_type <> 'project_update';
begin
  if v_actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_recipient_id is null or p_recipient_id = v_actor_id then
    return null;
  end if;

  if p_notification_type not in (
    'follow',
    'project_comment',
    'project_like',
    'project_save',
    'project_follow',
    'project_update'
  ) then
    raise exception 'invalid_notification_type';
  end if;

  if coalesce(trim(p_notification_title), '') = '' then
    raise exception 'notification_title_required';
  end if;

  if p_notification_type = 'follow' then
    if p_car_id is not null or not exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = v_actor_id
        and uf.following_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_like' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_likes cl on cl.car_id = c.id and cl.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_save' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_saves cs on cs.car_id = c.id and cs.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_follow' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.project_follows pf on pf.car_id = c.id and pf.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_comment' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_comments cc on cc.car_id = c.id and cc.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_update' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.project_follows pf on pf.car_id = c.id and pf.user_id = p_recipient_id
      where c.id = p_car_id
        and c.owner_id = v_actor_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  end if;

  if v_should_dedupe then
    select n.id
    into v_existing_id
    from public.notifications as n
    where n.user_id = p_recipient_id
      and n.actor_id = v_actor_id
      and n.type = p_notification_type
      and n.car_id is not distinct from p_car_id
    order by n.created_at desc
    limit 1;

    if v_existing_id is not null then
      update public.notifications as n
      set
        title = p_notification_title,
        body = p_notification_body,
        href = null,
        url = null,
        read_at = null,
        created_at = now()
      where n.id = v_existing_id;

      return v_existing_id;
    end if;
  end if;

  insert into public.notifications (
    user_id,
    actor_id,
    car_id,
    type,
    title,
    body
  )
  values (
    p_recipient_id,
    v_actor_id,
    p_car_id,
    p_notification_type,
    p_notification_title,
    p_notification_body
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

grant usage on schema public to anon, authenticated;

revoke select on public.profiles from anon;
revoke select on public.profiles from authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

grant select on public.car_comments, public.car_likes, public.car_saves to anon, authenticated;
grant select on public.user_follows, public.project_follows to authenticated;
revoke select on public.user_follows, public.project_follows from anon;
grant insert, delete on public.car_comments, public.car_likes, public.car_saves, public.user_follows, public.project_follows to authenticated;

revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant execute on function public.project_normalize_text(text) to anon, authenticated;
grant execute on function public.search_car_projects(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.suggest_car_project_terms(text, integer) to anon, authenticated;
grant execute on function public.increment_car_view(uuid) to anon, authenticated;
grant execute on function public.create_notification(uuid, text, uuid, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
