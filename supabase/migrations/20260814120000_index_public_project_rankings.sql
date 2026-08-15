create index if not exists idx_cars_public_likes
on public.cars (is_public, likes_count desc, created_at desc);
