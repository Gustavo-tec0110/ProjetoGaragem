-- Migration: tighten notifications_insert_system policy to require authenticated user
-- Generated on 2026-06-10

-- Drop existing policy
drop policy if exists "notifications_insert_system" on public.notifications;

-- Recreate policy: only allow inserts from authenticated users (auth.uid())
create policy "notifications_insert_system" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid());
