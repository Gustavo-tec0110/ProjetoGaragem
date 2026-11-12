begin;

-- Keep the six-argument API. The internal, explicit-date overload distinguishes
-- evolutions with the same title on different days; it runs the same guards.
do $overload$
declare source text; anchor text := 'where u.car_id = p_car_id and trim(u.title) = trim(p_notification_body)';
begin
  select prosrc into source from pg_proc
    where oid='public.create_notification(uuid,text,uuid,text,text,boolean)'::regprocedure;
  if (length(source)-length(replace(source,anchor,''))) <> length(anchor) then
    raise exception 'Notification event lookup differs from reviewed baseline';
  end if;
  source := replace(source,anchor,anchor || ' and (p_update_date is null or u.happened_at=p_update_date)');
  execute format('create function public.create_notification(p_recipient_id uuid,p_notification_type text,p_car_id uuid,p_notification_title text,p_notification_body text,p_dedupe boolean,p_update_date date)
    returns uuid language plpgsql security definer set search_path=pg_catalog,public as %L',source);
end;
$overload$;
revoke all on function public.create_notification(uuid,text,uuid,text,text,boolean,date) from public,anon;
grant execute on function public.create_notification(uuid,text,uuid,text,text,boolean,date) to authenticated;
create or replace function public.create_notification(
  p_recipient_id uuid,p_notification_type text,p_car_id uuid default null,
  p_notification_title text default null,p_notification_body text default null,p_dedupe boolean default true
) returns uuid language sql security invoker set search_path=pg_catalog,public as $$
  select public.create_notification(p_recipient_id,p_notification_type,p_car_id,
    p_notification_title,p_notification_body,p_dedupe,null::date);
$$;

-- Save and notify in the same transaction, using the existing guarded RPC for
-- every recipient. A delivery error rolls the edit back, so retry cannot silently
-- lose an evolution that had already been saved. No queue/worker/background task.
do $upgrade$
declare definition text; source text; anchor text;
begin
  select pg_get_functiondef(oid),prosrc into definition,source from pg_proc
    where oid='public.save_car_project_atomic(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure
      and not prosecdef;
  if definition is null then raise exception 'Expected SECURITY INVOKER atomic save'; end if;
  anchor := E'  v_car public.cars%rowtype;';
  if (length(source)-length(replace(source,anchor,''))) <> length(anchor)
    or position(E'    delete from public.car_build_updates where car_id = p_car_id;' in source)=0
    or position(E'  return query\n  select v_car.id' in source)=0 then
    raise exception 'Atomic save differs from reviewed insertion points; inspect before applying';
  end if;
  definition := replace(definition,anchor,anchor || E'\n  v_previous_update_keys text[];\n  v_new_update record;\n  v_recipient record;');
  definition := replace(definition,E'    delete from public.car_build_updates where car_id = p_car_id;', $snapshot$
    select coalesce(array_agg(trim(u.title)||'|'||u.happened_at::text),array[]::text[])
      into v_previous_update_keys from public.car_build_updates u where u.car_id=p_car_id;
    delete from public.car_build_updates where car_id = p_car_id;$snapshot$);
  definition := replace(definition,E'  return query\n  select v_car.id', $notify$
  if p_car_id is not null and v_car.is_public then
    for v_new_update in
      select u.title,u.happened_at from public.car_build_updates u
      where u.car_id=v_car.id
        and not (trim(u.title)||'|'||u.happened_at::text = any(v_previous_update_keys))
      order by u.happened_at,u.title
    loop
      for v_recipient in select f.user_id from public.project_follows f
        where f.car_id=v_car.id and f.user_id<>v_user_id order by f.user_id
      loop
        perform public.create_notification(v_recipient.user_id,'project_update',v_car.id,
          left(v_car.name,160)||' publicou uma nova evolucao',v_new_update.title,false,v_new_update.happened_at);
      end loop;
    end loop;
  end if;

  return query
  select v_car.id$notify$);
  execute definition;
end;
$upgrade$;

-- Capability boundary for the new application. If migrations are missing,
-- editing fails before any write instead of silently skipping notifications.
create function public.save_car_project_with_notifications(
  p_car_id uuid,p_car jsonb,p_photos jsonb,p_parts jsonb,p_updates jsonb,p_expenses jsonb
) returns table(id uuid,slug text,name text,main_photo_url text,photo_urls text[])
language sql security invoker set search_path='' as $$
  select * from public.save_car_project_atomic(p_car_id,p_car,p_photos,p_parts,p_updates,p_expenses);
$$;
revoke all on function public.save_car_project_with_notifications(uuid,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_car_project_with_notifications(uuid,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
