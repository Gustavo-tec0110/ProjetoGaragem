-- ProjetoGaragem — schema Supabase (Postgres)
-- Execute este arquivo no Supabase (SQL Editor) antes do seed.sql.

begin;

-- Extensões úteis
create extension if not exists pgcrypto;
create extension if not exists citext;

-- =========================
-- Tabelas de domínio
-- =========================

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text not null,
  model text not null,
  year_start integer not null,
  year_end integer,
  engine_options jsonb not null default '[]'::jsonb,
  power_cv integer,
  torque_nm integer,
  weight_kg integer,
  category text,
  fuel_type text,
  transmission_options jsonb not null default '[]'::jsonb,
  common_issues text[] not null default '{}'::text[],
  avg_price_min integer,
  avg_price_max integer,
  created_at timestamptz not null default now(),
  constraint cars_year_range_chk check (year_end is null or year_end >= year_start),
  constraint cars_avg_price_chk check (
    avg_price_min is null
    or avg_price_max is null
    or avg_price_max >= avg_price_min
  )
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  subcategory text,
  brand text,
  description text,
  price_min integer,
  price_max integer,
  compatible_cars text[] not null default '{}'::text[],
  affiliate_url text default null,
  affiliate_store text default null,
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  constraint parts_price_chk check (
    price_min is null
    or price_max is null
    or price_max >= price_min
  )
);

-- =========================
-- Social / usuários
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  car_count integer not null default 0,
  builds_count integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  badges jsonb not null default '[]'::jsonb,
  reputation_score integer not null default 0,
  garage_car_slugs text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint profiles_counts_chk check (
    car_count >= 0
    and builds_count >= 0
    and followers_count >= 0
    and following_count >= 0
    and reputation_score >= 0
  )
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_chk check (follower_id <> following_id)
);

-- =========================
-- Builds
-- =========================

create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete restrict,
  style text not null,
  budget_min integer,
  budget_max integer,
  compatibility_score integer not null default 0,
  parts jsonb not null default '[]'::jsonb,
  description text,
  car_photo_url text,
  is_public boolean not null default true,
  likes_count integer not null default 0,
  shares_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builds_budget_chk check (
    (budget_min is null or budget_min >= 0)
    and (budget_max is null or budget_max >= 0)
    and (budget_min is null or budget_max is null or budget_max >= budget_min)
  ),
  constraint builds_scores_chk check (
    compatibility_score between 0 and 100
    and likes_count >= 0
    and shares_count >= 0
    and views_count >= 0
  )
);

create table if not exists public.build_timeline (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text,
  before_photo_url text,
  description text,
  mod_installed text,
  cost integer,
  date date,
  created_at timestamptz not null default now(),
  constraint build_timeline_cost_chk check (cost is null or cost >= 0)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  build_id uuid not null references public.builds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, build_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- =========================
-- Índices
-- =========================

create index if not exists idx_parts_compatible_cars on public.parts using gin (compatible_cars);
create index if not exists idx_builds_is_public on public.builds (is_public);
create index if not exists idx_builds_style on public.builds (style);
create index if not exists idx_builds_car_id on public.builds (car_id);
create index if not exists idx_builds_user_id on public.builds (user_id);
create index if not exists idx_likes_build_id on public.likes (build_id);
create index if not exists idx_likes_created_at on public.likes (created_at);
create index if not exists idx_follows_follower on public.follows (follower_id);
create index if not exists idx_follows_following on public.follows (following_id);
create index if not exists idx_comments_build_id on public.comments (build_id);
create index if not exists idx_build_timeline_build_id on public.build_timeline (build_id);

-- =========================
-- Triggers / funções
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_builds_set_updated_at on public.builds;
create trigger trg_builds_set_updated_at
before update on public.builds
for each row
execute function public.set_updated_at();

create or replace function public.handle_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.builds
      set likes_count = likes_count + 1
      where id = new.build_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.builds
      set likes_count = greatest(likes_count - 1, 0)
      where id = old.build_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_likes_count on public.likes;
create trigger trg_likes_count
after insert or delete on public.likes
for each row
execute function public.handle_like_count();

-- =========================
-- Ranking semanal (likes nos últimos 7 dias)
-- =========================

create or replace function public.weekly_build_ranking(limit_count integer default 12)
returns table(build_id uuid, likes_week bigint)
language sql
stable
as $$
  select l.build_id, count(*)::bigint as likes_week
  from public.likes l
  join public.builds b on b.id = l.build_id
  where b.is_public = true
    and l.created_at >= now() - interval '7 days'
  group by l.build_id
  order by likes_week desc
  limit limit_count;
$$;

grant execute on function public.weekly_build_ranking(integer) to anon, authenticated;

-- =========================
-- RLS + policies
-- =========================

alter table public.cars enable row level security;
alter table public.parts enable row level security;
alter table public.profiles enable row level security;
alter table public.builds enable row level security;
alter table public.build_timeline enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- cars: leitura pública
drop policy if exists "cars_read_all" on public.cars;
create policy "cars_read_all"
on public.cars
for select
to anon, authenticated
using (true);

-- parts: leitura pública
drop policy if exists "parts_read_all" on public.parts;
create policy "parts_read_all"
on public.parts
for select
to anon, authenticated
using (true);

-- profiles: leitura pública, escrita somente do dono
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- builds: leitura pública (is_public) e privada do dono; escrita do dono
drop policy if exists "builds_read_public_or_owner" on public.builds;
create policy "builds_read_public_or_owner"
on public.builds
for select
to anon, authenticated
using (is_public = true or user_id = auth.uid());

drop policy if exists "builds_insert_own" on public.builds;
create policy "builds_insert_own"
on public.builds
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "builds_update_own" on public.builds;
create policy "builds_update_own"
on public.builds
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "builds_delete_own" on public.builds;
create policy "builds_delete_own"
on public.builds
for delete
to authenticated
using (user_id = auth.uid());

-- build_timeline: leitura pública se build pública; escrita somente dono
drop policy if exists "build_timeline_read_public_or_owner" on public.build_timeline;
create policy "build_timeline_read_public_or_owner"
on public.build_timeline
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.builds b
    where b.id = build_id
      and (b.is_public = true or b.user_id = auth.uid())
  )
);

drop policy if exists "build_timeline_insert_own" on public.build_timeline;
create policy "build_timeline_insert_own"
on public.build_timeline
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.builds b where b.id = build_id and b.user_id = auth.uid()
  )
);

drop policy if exists "build_timeline_update_own" on public.build_timeline;
create policy "build_timeline_update_own"
on public.build_timeline
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.builds b where b.id = build_id and b.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.builds b where b.id = build_id and b.user_id = auth.uid()
  )
);

drop policy if exists "build_timeline_delete_own" on public.build_timeline;
create policy "build_timeline_delete_own"
on public.build_timeline
for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.builds b where b.id = build_id and b.user_id = auth.uid()
  )
);

-- follows: leitura pública; escrita somente autenticado (auto)
drop policy if exists "follows_read_all" on public.follows;
create policy "follows_read_all"
on public.follows
for select
to anon, authenticated
using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
on public.follows
for insert
to authenticated
with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
on public.follows
for delete
to authenticated
using (follower_id = auth.uid());

-- likes: leitura pública; escrita somente autenticado
drop policy if exists "likes_read_all" on public.likes;
create policy "likes_read_all"
on public.likes
for select
to anon, authenticated
using (true);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes
for delete
to authenticated
using (user_id = auth.uid());

-- comments: leitura pública; escrita somente autenticado
drop policy if exists "comments_read_all" on public.comments;
create policy "comments_read_all"
on public.comments
for select
to anon, authenticated
using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
on public.comments
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
on public.comments
for delete
to authenticated
using (user_id = auth.uid());

commit;
