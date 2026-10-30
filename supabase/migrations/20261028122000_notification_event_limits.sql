begin;

-- Retain receipts when an inbox item is dismissed: deleting it must not permit replay.
create table public.notification_event_receipts (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null,
  notification_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(actor_id, recipient_id, event_key)
);
create index notification_event_receipts_quota on public.notification_event_receipts(actor_id, recipient_id, created_at);
alter table public.notification_event_receipts enable row level security;
revoke all on public.notification_event_receipts from public, anon, authenticated;

create or replace function public.create_notification(
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
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_existing_id uuid;
  v_inserted_id uuid;
  v_event_key text;
  v_update record;
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

  if char_length(p_notification_title) > 240 or char_length(coalesce(p_notification_body, '')) > 1000 then
    raise exception 'notification_content_too_large';
  end if;

  if p_notification_type = 'follow' then
    if p_car_id is not null or not exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = v_actor_id
        and uf.following_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_like' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_likes cl on cl.car_id = c.id and cl.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id and c.is_public = true
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_save' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_saves cs on cs.car_id = c.id and cs.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id and c.is_public = true
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_follow' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.project_follows pf on pf.car_id = c.id and pf.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id and c.is_public = true
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_comment' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_comments cc on cc.car_id = c.id and cc.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id and c.is_public = true
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_update' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.project_follows pf on pf.car_id = c.id and pf.user_id = p_recipient_id
      where c.id = p_car_id
        and c.owner_id = v_actor_id and c.is_public = true
    ) then
      raise exception 'invalid_notification_context';
    end if;
  end if;

  -- Event identities are derived from persisted actions, never from p_dedupe.
  -- A recreated social relation is a new event, still subject to the pair quota.
  v_event_key := coalesce(p_car_id::text, '') || ':' || p_notification_type;
  if p_notification_type = 'follow' then
    select v_event_key || ':' || extract(epoch from uf.created_at)::text into v_event_key
      from public.user_follows uf where uf.follower_id = v_actor_id and uf.following_id = p_recipient_id;
  elsif p_notification_type = 'project_like' then
    select v_event_key || ':' || extract(epoch from cl.created_at)::text into v_event_key
      from public.car_likes cl where cl.user_id = v_actor_id and cl.car_id = p_car_id;
  elsif p_notification_type = 'project_save' then
    select v_event_key || ':' || extract(epoch from cs.created_at)::text into v_event_key
      from public.car_saves cs where cs.user_id = v_actor_id and cs.car_id = p_car_id;
  elsif p_notification_type = 'project_follow' then
    select v_event_key || ':' || pf.id::text into v_event_key
      from public.project_follows pf where pf.user_id = v_actor_id and pf.car_id = p_car_id;
  elsif p_notification_type = 'project_update' then
    select u.title, u.happened_at into v_update
      from public.car_build_updates u
      where u.car_id = p_car_id and trim(u.title) = trim(p_notification_body)
      order by u.happened_at desc, u.created_at desc limit 1;
    if not found then raise exception 'invalid_notification_context'; end if;
    -- Atomic saves replace update row IDs, so use the application's stable key.
    v_event_key := v_event_key || ':' || trim(v_update.title) || ':' || to_char(v_update.happened_at, 'YYYY-MM-DD');
    select left(c.name, 160) || ' publicou uma nova evolucao' into p_notification_title
      from public.cars c where c.id = p_car_id;
    p_notification_body := v_update.title;
  elsif p_notification_type = 'project_comment' then
    select v_event_key || ':' || cc.id::text into v_event_key from public.car_comments cc
      where cc.car_id = p_car_id and cc.user_id = v_actor_id
      order by cc.created_at desc, cc.id desc limit 1;
  end if;

  -- Serialize all notifications of this actor to this recipient, including
  -- different events and simultaneous calls. Hash collisions only serialize more.
  perform pg_advisory_xact_lock(hashtextextended(v_actor_id::text || ':' || p_recipient_id::text, 0));
  select notification_id into v_existing_id from public.notification_event_receipts
    where actor_id = v_actor_id and recipient_id = p_recipient_id and event_key = v_event_key;
  if found then return v_existing_id; end if;
  if (select count(*) from public.notification_event_receipts
      where actor_id = v_actor_id and recipient_id = p_recipient_id
        and created_at > clock_timestamp() - interval '10 minutes') >= 30 then
    -- Return without insertion rather than throwing/rolling back the counter.
    return null;
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

  insert into public.notification_event_receipts(actor_id, recipient_id, event_key, notification_id)
    values (v_actor_id, p_recipient_id, v_event_key, v_inserted_id);
  return v_inserted_id;
end;
$$;

revoke all on function public.create_notification(uuid,text,uuid,text,text,boolean) from public, anon;
grant execute on function public.create_notification(uuid,text,uuid,text,text,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
