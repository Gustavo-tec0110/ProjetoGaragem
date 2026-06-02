-- Projeto Garagem MVP schema
-- Fonte canonica: perfis de usuario, paginas publicas de carros/projetos,
-- pecas, fotos e interacoes sociais simples.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  state text,
  is_saves_public boolean not null default false,
  cars_count integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_chk check (username ~ '^[a-z0-9][a-z0-9_-]{2,23}$')
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
  is_public boolean not null default true,
  likes_count integer not null default 0,
  saves_count integer not null default 0,
  comments_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cars_year_chk check (year between 1900 and extract(year from now())::integer + 1),
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
  created_at timestamptz not null default now()
);

create table if not exists public.car_parts (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  name text not null,
  category text not null,
  brand text,
  description text,
  status text not null check (status in ('installed', 'planned')),
  priority text,
  price_estimate integer,
  external_url text,
  affiliate_url text,
  store_name text,
  product_id text,
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

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_chk check (follower_id <> following_id)
);

create table if not exists public.part_requirements (
  id uuid primary key default gen_random_uuid(),
  part_category text not null,
  required_category text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_cars_owner_id on public.cars (owner_id);
create index if not exists idx_cars_slug on public.cars (slug);
create index if not exists idx_cars_public_recent on public.cars (is_public, created_at desc);
create index if not exists idx_cars_brand_model on public.cars (brand, model);
create index if not exists idx_cars_category on public.cars (category);
create index if not exists idx_cars_state on public.cars (state);
create index if not exists idx_car_parts_car_id on public.car_parts (car_id);
create index if not exists idx_car_photos_car_id on public.car_photos (car_id);
create index if not exists idx_car_comments_car_id on public.car_comments (car_id, created_at desc);
create index if not exists idx_car_likes_user_id on public.car_likes (user_id);
create index if not exists idx_car_saves_user_id on public.car_saves (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create or replace function public.bump_car_like_count()
returns trigger
language plpgsql
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

alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.car_photos enable row level security;
alter table public.car_parts enable row level security;
alter table public.car_likes enable row level security;
alter table public.car_saves enable row level security;
alter table public.car_comments enable row level security;
alter table public.user_follows enable row level security;
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
for select to authenticated using (
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

drop policy if exists "user_follows_read_all" on public.user_follows;
create policy "user_follows_read_all" on public.user_follows
for select to anon, authenticated using (true);

drop policy if exists "user_follows_insert_own" on public.user_follows;
create policy "user_follows_insert_own" on public.user_follows
for insert to authenticated with check (follower_id = auth.uid());

drop policy if exists "user_follows_delete_own" on public.user_follows;
create policy "user_follows_delete_own" on public.user_follows
for delete to authenticated using (follower_id = auth.uid());

drop policy if exists "part_requirements_read_all" on public.part_requirements;
create policy "part_requirements_read_all" on public.part_requirements
for select to anon, authenticated using (true);

insert into public.part_requirements (part_category, required_category, message)
values
  ('Turbo', 'Intercooler', 'Projetos turbo geralmente pedem intercooler, alimentacao, acerto e embreagem.'),
  ('Turbo', 'Alimentacao', 'Verifique bomba, bicos e linha de combustivel antes de subir pressao.'),
  ('Turbo', 'Eletronica', 'Acerto/injecao e wideband reduzem risco em projeto turbo.'),
  ('Suspensao', 'Pneus', 'Mudancas de altura pedem revisao de pneus, alinhamento e geometria.'),
  ('Freios', 'Pneus', 'Upgrade de freio rende mais quando pneus e rodas acompanham o conjunto.')
on conflict do nothing;

commit;
