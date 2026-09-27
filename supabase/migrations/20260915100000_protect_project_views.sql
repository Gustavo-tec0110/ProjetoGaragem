begin;

create table if not exists public.car_view_windows (
  car_id uuid not null references public.cars(id) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  window_start date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (car_id, visitor_hash, window_start)
);
alter table public.car_view_windows enable row level security;

create or replace function public.record_car_view(p_car_id uuid, p_visitor_hash text)
returns table(counted boolean, views_count integer)
language plpgsql security definer set search_path = public
as $$
declare v_inserted boolean := false; v_rows integer := 0; v_views integer;
begin
  if p_visitor_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid visitor token.' using errcode = '22023'; end if;
  if not exists (select 1 from public.cars where id = p_car_id and is_public) then
    raise exception 'Public project not found.' using errcode = 'P0002';
  end if;
  insert into public.car_view_windows (car_id, visitor_hash) values (p_car_id, p_visitor_hash)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  v_inserted := v_rows = 1;
  if v_inserted then update public.cars set views_count = views_count + 1 where id = p_car_id returning cars.views_count into v_views;
  else select cars.views_count into v_views from public.cars where id = p_car_id; end if;
  delete from public.car_view_windows where window_start < current_date - 2;
  return query select v_inserted, v_views;
end; $$;

revoke all on table public.car_view_windows from anon, authenticated;
revoke all on function public.increment_car_view(uuid) from public, anon, authenticated;
revoke all on function public.record_car_view(uuid, text) from public, anon, authenticated;
grant execute on function public.record_car_view(uuid, text) to service_role;
create index if not exists idx_car_view_windows_expiry on public.car_view_windows (window_start);
notify pgrst, 'reload schema';
commit;
