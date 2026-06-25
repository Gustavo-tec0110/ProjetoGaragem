begin;

-- Canonical notifications runtime consolidation.
-- Older notification migrations are kept for production history; this migration
-- restates the final idempotent shape used by the application:
-- 1. notifications table/columns/indexes
-- 2. RLS policies and grants
-- 3. create_notification RPC

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

create or replace function public.create_notification(
  recipient_id uuid,
  notification_type text,
  car_id uuid default null,
  notification_title text default null,
  notification_body text default null,
  dedupe boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  existing_id uuid;
  inserted_id uuid;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  if recipient_id is null or recipient_id = actor then
    return null;
  end if;

  if notification_type not in (
    'follow',
    'project_comment',
    'project_like',
    'project_save',
    'project_follow',
    'project_update'
  ) then
    raise exception 'invalid_notification_type';
  end if;

  if coalesce(trim(notification_title), '') = '' then
    raise exception 'notification_title_required';
  end if;

  if dedupe then
    select n.id
    into existing_id
    from public.notifications as n
    where n.user_id = recipient_id
      and n.actor_id = actor
      and n.type = notification_type
      and n.car_id is not distinct from create_notification.car_id
    order by n.created_at desc
    limit 1;

    if existing_id is not null then
      update public.notifications
      set
        title = notification_title,
        body = notification_body,
        href = null,
        url = null,
        read_at = null,
        created_at = now()
      where id = existing_id;

      return existing_id;
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
    recipient_id,
    actor,
    create_notification.car_id,
    notification_type,
    notification_title,
    notification_body
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

grant execute on function public.create_notification(uuid, text, uuid, text, text, boolean) to authenticated;

comment on table public.notifications is
  'Canonical notification inbox. user_id is the recipient; actor_id is auth.uid() from create_notification.';
comment on function public.create_notification(uuid, text, uuid, text, text, boolean) is
  'Creates or refreshes a notification for the authenticated actor, skipping self-notifications.';

notify pgrst, 'reload schema';

commit;
