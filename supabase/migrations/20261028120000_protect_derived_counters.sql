begin;

-- Table grants override column revocations. Replace them with grants on the
-- current editable columns; new columns require an explicit grant in future.
do $$
declare t text; protected text[]; editable text; col text;
begin
  foreach t in array array['cars','profiles'] loop
    protected := case t when 'cars' then
      array['likes_count','saves_count','comments_count','views_count','project_followers_count']
      else array['cars_count','followers_count','following_count'] end;
    execute format('revoke insert, update on public.%I from public, anon, authenticated', t);
    foreach col in array protected loop
      execute format('revoke insert (%I), update (%I) on public.%I from public, anon, authenticated', col, col, t);
    end loop;
    select string_agg(quote_ident(attname), ', ' order by attnum) into editable
      from pg_attribute where attrelid = format('public.%I',t)::regclass
        and attnum > 0 and not attisdropped and attgenerated = '' and not (attname = any(protected));
    execute format('grant insert (%s), update (%s) on public.%I to authenticated', editable, editable, t);
  end loop;
end $$;

-- These are implementation details called by triggers, never client RPCs.
revoke all on function public.refresh_project_followers_count(uuid) from public, anon, authenticated;

-- Comments previously used an invoker trigger; it must retain its narrow
-- counter write after callers lose column privileges.
alter function public.bump_car_comment_count() security definer;
alter function public.bump_car_comment_count() set search_path = pg_catalog, public;
revoke all on function public.bump_car_comment_count() from public, anon, authenticated;
do $$
begin
  -- Absent in the hosted schema inspected on 2026-10-29. Do not recreate a
  -- retired helper merely to revoke it; still harden installations that have it.
  if to_regprocedure('public.refresh_profile_cars_count(uuid)') is not null then
    revoke all on function public.refresh_profile_cars_count(uuid) from public, anon, authenticated;
  end if;
end $$;

-- Keep the atomic RPC SECURITY INVOKER (and therefore all existing RLS/rate
-- limits). Its INSERT must omit counters rather than explicitly insert zeros.
do $atomic$
declare definition text; source text; cols text; vals text;
begin
  select pg_get_functiondef(oid), prosrc into definition, source from pg_proc
    where oid = 'public.save_car_project_atomic(uuid,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure;
  if md5(source) <> '15701d0fe6677e752c58cbef63bf3ab1' then
    raise exception 'save_car_project_atomic differs from reviewed baseline; inspect before applying counter migration';
  end if;
  select string_agg(quote_ident(attname), ', ' order by attnum),
         string_agg('v_car.' || quote_ident(attname), ', ' order by attnum)
    into cols, vals from pg_attribute where attrelid = 'public.cars'::regclass
    and attnum > 0 and not attisdropped and attgenerated = ''
    and attname not in ('likes_count','saves_count','comments_count','views_count','project_followers_count');
  definition := replace(definition, E'insert into public.cars\n    select v_car.*\n    returning * into v_car;',
    format('insert into public.cars (%s) select %s returning * into v_car;', cols, vals));
  execute definition;
end;
$atomic$;

notify pgrst, 'reload schema';
commit;
