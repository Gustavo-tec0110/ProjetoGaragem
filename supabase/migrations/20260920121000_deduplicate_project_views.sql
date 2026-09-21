begin;

create table if not exists public.car_view_events (
  car_id uuid not null references public.cars(id) on delete cascade,
  viewer_hash text not null,
  view_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (car_id, viewer_hash, view_date),
  constraint car_view_events_hash_chk check (char_length(viewer_hash) = 64)
);

create index if not exists idx_car_view_events_retention
  on public.car_view_events (view_date);

alter table public.car_view_events enable row level security;
revoke all on table public.car_view_events from public, anon, authenticated;

drop function if exists public.increment_car_view(uuid);

create or replace function public.increment_car_view(target_car_id uuid)
returns table (
  incremented boolean,
  views_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_headers jsonb := coalesce(
    nullif(current_setting('request.headers', true), ''),
    '{}'
  )::jsonb;
  v_user_id uuid := auth.uid();
  v_client_ip text;
  v_user_agent text;
  v_viewer_hash text;
  v_inserted boolean := false;
  v_views_count integer;
begin
  select c.views_count
    into v_views_count
    from public.cars as c
    where c.id = target_car_id
      and c.is_public = true;

  if not found then
    return query select false, null::integer;
    return;
  end if;

  if v_user_id is not null then
    v_viewer_hash := encode(extensions.digest('user:' || v_user_id::text, 'sha256'), 'hex');
  else
    v_client_ip := coalesce(
      nullif(v_headers ->> 'cf-connecting-ip', ''),
      nullif(v_headers ->> 'x-real-ip', ''),
      nullif(split_part(v_headers ->> 'x-forwarded-for', ',', 1), ''),
      'unknown'
    );
    v_user_agent := left(coalesce(nullif(v_headers ->> 'user-agent', ''), 'unknown'), 256);
    v_viewer_hash := encode(
      extensions.digest('anon:' || current_date::text || ':' || v_client_ip || ':' || v_user_agent, 'sha256'),
      'hex'
    );
  end if;

  insert into public.car_view_events (car_id, viewer_hash, view_date)
  values (target_car_id, v_viewer_hash, current_date)
  on conflict do nothing
  returning true into v_inserted;

  if coalesce(v_inserted, false) then
    update public.cars as c
      set views_count = c.views_count + 1
      where c.id = target_car_id
        and c.is_public = true
      returning c.views_count into v_views_count;
  end if;

  delete from public.car_view_events
    where view_date < current_date - 7;

  return query select coalesce(v_inserted, false), v_views_count;
end;
$$;

revoke all on function public.increment_car_view(uuid) from public;
grant execute on function public.increment_car_view(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
