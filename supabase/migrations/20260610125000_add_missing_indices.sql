-- Migration: add missing indexes for performance
-- Generated on 2026-06-10

-- Index on cars.slug for fast lookup by slug
create index if not exists idx_cars_slug on public.cars (slug);

-- Index on car_comments.content (btree) – useful for exact MATCHES; consider GIN for full‑text later
create index if not exists idx_car_comments_content on public.car_comments (content);

-- Index on car_expenses.note (btree)
create index if not exists idx_car_expenses_note on public.car_expenses (note);
