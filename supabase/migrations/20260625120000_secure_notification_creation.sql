begin;

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

revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "notifications_insert_system" on public.notifications;

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

notify pgrst, 'reload schema';

commit;
