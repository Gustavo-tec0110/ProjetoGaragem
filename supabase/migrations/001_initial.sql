-- Supabase migration: initial schema
-- Tables: cars, parts, builds, build_timeline, profiles, follows, likes, comments, users (auth provided)

create schema if not exists public;

-- cars
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text not null,
  model text not null,
  year_start int not null,
  year_end int not null,
  engine_options jsonb,
  power_cv int,
  torque_nm int,
  weight_kg int,
  category text,
  fuel_type text,
  transmission_options jsonb,
  common_issues text,
  avg_price_min numeric,
  avg_price_max numeric,
  created_at timestamp with time zone default now()
);

-- parts
create table public.parts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  subcategory text,
  brand text,
  description text,
  price_min numeric,
  price_max numeric,
  compatible_cars text[],
  affiliate_url text default null,
  affiliate_store text default null,
  image_url text,
  notes text,
  created_at timestamp with time zone default now()
);

-- builds
create table public.builds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  user_id uuid references auth.users(id) on delete cascade,
  car_id uuid references public.cars(id) on delete cascade,
  style text,
  budget_min numeric,
  budget_max numeric,
  compatibility_score numeric,
  parts jsonb,
  description text,
  is_public boolean default false,
  likes_count int default 0,
  shares_count int default 0,
  views_count int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- build_timeline
create table public.build_timeline (
  id uuid primary key default gen_random_uuid(),
  build_id uuid references public.builds(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  photo_url text,
  description text,
  mod_installed text,
  cost numeric,
  "date" date,
  created_at timestamp with time zone default now()
);

-- profiles (one‑to‑one with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  car_count int default 0,
  builds_count int default 0,
  followers_count int default 0,
  following_count int default 0,
  badges jsonb,
  reputation_score numeric default 0,
  created_at timestamp with time zone default now()
);

-- follows
create table public.follows (
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (follower_id, following_id)
);

-- likes
create table public.likes (
  user_id uuid references auth.users(id) on delete cascade,
  build_id uuid references public.builds(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (user_id, build_id)
);

-- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  build_id uuid references public.builds(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- indexes for performance
create index idx_builds_public on public.builds(is_public);
create index idx_builds_style on public.builds(style);
create index idx_builds_car on public.builds(car_id);
create index idx_likes_build on public.likes(build_id);
create index idx_follows_follower on public.follows(follower_id);
