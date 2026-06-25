begin;

drop function if exists public.create_notification(uuid, text, uuid, text, text, boolean);

create function public.create_notification(
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

grant execute on function public.create_notification(uuid, text, uuid, text, text, boolean) to authenticated;

comment on function public.create_notification(uuid, text, uuid, text, text, boolean) is
  'Creates or refreshes a notification for the authenticated actor, skipping self-notifications.';

notify pgrst, 'reload schema';

commit;
