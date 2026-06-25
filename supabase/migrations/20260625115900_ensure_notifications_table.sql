begin;

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
    type in (
      'follow',
      'project_comment',
      'project_like',
      'project_save',
      'project_follow',
      'project_update'
    )
  )
);

alter table public.notifications
  add column if not exists recipient_id uuid generated always as (user_id) stored,
  add column if not exists project_id uuid,
  add column if not exists message text generated always as (body) stored,
  add column if not exists href text,
  add column if not exists url text;

alter table public.notifications drop constraint if exists notifications_type_chk;
alter table public.notifications
  add constraint notifications_type_chk check (
    type in (
      'follow',
      'project_comment',
      'project_like',
      'project_save',
      'project_follow',
      'project_update'
    )
  );

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, read_at, created_at desc);
create index if not exists idx_notifications_car_id
  on public.notifications (car_id, created_at desc);
create index if not exists idx_notifications_project_id
  on public.notifications (project_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_system" on public.notifications;

revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

notify pgrst, 'reload schema';

commit;
