begin;

alter table public.cars
  add column if not exists project_followers_count integer not null default 0,
  add column if not exists factory_engine text,
  add column if not exists factory_induction text,
  add column if not exists factory_power_cv integer,
  add column if not exists factory_transmission text,
  add column if not exists factory_drivetrain text;

do $$
begin
  alter table public.cars drop constraint if exists cars_project_followers_count_chk;
  alter table public.cars
    add constraint cars_project_followers_count_chk
    check (project_followers_count >= 0);

  alter table public.car_build_updates drop constraint if exists car_build_updates_category_chk;
  alter table public.car_build_updates
    add constraint car_build_updates_category_chk
    check (
      category in (
        'manutencao',
        'estetica',
        'performance',
        'interior',
        'suspensao',
        'rodas',
        'motor',
        'eletrica',
        'compra',
        'antes_depois',
        'outro'
      )
    );
end $$;

create table if not exists public.project_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_follows_unique unique (user_id, car_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  car_id uuid references public.cars(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_chk check (
    type in (
      'project_comment',
      'project_like',
      'project_save',
      'project_follow',
      'project_update'
    )
  )
);

create index if not exists idx_project_follows_car_id
  on public.project_follows (car_id, created_at desc);
create index if not exists idx_project_follows_user_id
  on public.project_follows (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, read_at, created_at desc);
create index if not exists idx_notifications_car_id
  on public.notifications (car_id, created_at desc);
create index if not exists idx_cars_project_followers_count
  on public.cars (project_followers_count desc);

alter table public.project_follows enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "project_follows_read_all" on public.project_follows;
create policy "project_follows_read_all" on public.project_follows
for select to anon, authenticated using (true);

drop policy if exists "project_follows_insert_own" on public.project_follows;
create policy "project_follows_insert_own" on public.project_follows
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "project_follows_delete_own" on public.project_follows;
create policy "project_follows_delete_own" on public.project_follows
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_system" on public.notifications
for insert to authenticated with check (user_id <> auth.uid());

create or replace function public.refresh_project_followers_count(target_car_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cars
  set project_followers_count = (
    select count(*)::integer
    from public.project_follows pf
    where pf.car_id = target_car_id
  )
  where id = target_car_id;
$$;

create or replace function public.sync_project_followers_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_project_followers_count(new.car_id);
    return new;
  elsif tg_op = 'DELETE' then
    perform public.refresh_project_followers_count(old.car_id);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_project_followers_count on public.project_follows;
create trigger trg_project_followers_count
after insert or delete on public.project_follows
for each row execute function public.sync_project_followers_count();

update public.cars c
set project_followers_count = (
  select count(*)::integer
  from public.project_follows pf
  where pf.car_id = c.id
);

drop trigger if exists trg_notify_project_followers_on_update on public.car_build_updates;
drop function if exists public.notify_project_followers_on_update();

grant select on public.project_follows to anon, authenticated;
grant insert, delete on public.project_follows to authenticated;
grant select, update on public.notifications to authenticated;
grant insert on public.notifications to authenticated;

grant execute on function public.refresh_project_followers_count(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
