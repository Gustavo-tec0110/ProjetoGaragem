begin;

alter table public.cars
  add column if not exists project_followers_count integer not null default 0;

create table if not exists public.project_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_follows_unique unique (user_id, car_id)
);

create index if not exists idx_project_follows_car_id
  on public.project_follows (car_id, created_at desc);

create index if not exists idx_project_follows_user_id
  on public.project_follows (user_id, created_at desc);

create index if not exists idx_cars_project_followers_count
  on public.cars (project_followers_count desc);

grant usage on schema public to anon, authenticated;

alter table public.car_likes enable row level security;
alter table public.car_saves enable row level security;
alter table public.project_follows enable row level security;

drop policy if exists "car_likes_read_all" on public.car_likes;
create policy "car_likes_read_all" on public.car_likes
for select to anon, authenticated using (true);

drop policy if exists "car_likes_insert_own" on public.car_likes;
create policy "car_likes_insert_own" on public.car_likes
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "car_likes_delete_own" on public.car_likes;
create policy "car_likes_delete_own" on public.car_likes
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "car_saves_read_own_or_public_owner" on public.car_saves;
create policy "car_saves_read_own_or_public_owner" on public.car_saves
for select to anon, authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = user_id and p.is_saves_public = true
  )
);

drop policy if exists "car_saves_insert_own" on public.car_saves;
create policy "car_saves_insert_own" on public.car_saves
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "car_saves_delete_own" on public.car_saves;
create policy "car_saves_delete_own" on public.car_saves
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "project_follows_read_all" on public.project_follows;
create policy "project_follows_read_all" on public.project_follows
for select to anon, authenticated using (true);

drop policy if exists "project_follows_insert_own" on public.project_follows;
create policy "project_follows_insert_own" on public.project_follows
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "project_follows_delete_own" on public.project_follows;
create policy "project_follows_delete_own" on public.project_follows
for delete to authenticated using (user_id = auth.uid());

create or replace function public.bump_car_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.cars
    set likes_count = likes_count + 1
    where id = new.car_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.cars
    set likes_count = greatest(likes_count - 1, 0)
    where id = old.car_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.bump_car_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.cars
    set saves_count = saves_count + 1
    where id = new.car_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.cars
    set saves_count = greatest(saves_count - 1, 0)
    where id = old.car_id;
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.increment_car_view(target_car_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
begin
  update public.cars
  set views_count = views_count + 1
  where id = target_car_id
    and is_public = true;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

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

drop trigger if exists trg_car_likes_count on public.car_likes;
create trigger trg_car_likes_count
after insert or delete on public.car_likes
for each row execute function public.bump_car_like_count();

drop trigger if exists trg_car_saves_count on public.car_saves;
create trigger trg_car_saves_count
after insert or delete on public.car_saves
for each row execute function public.bump_car_save_count();

drop trigger if exists trg_project_followers_count on public.project_follows;
create trigger trg_project_followers_count
after insert or delete on public.project_follows
for each row execute function public.sync_project_followers_count();

update public.cars c
set likes_count = (
  select count(*)::integer
  from public.car_likes cl
  where cl.car_id = c.id
);

update public.cars c
set saves_count = (
  select count(*)::integer
  from public.car_saves cs
  where cs.car_id = c.id
);

update public.cars c
set project_followers_count = (
  select count(*)::integer
  from public.project_follows pf
  where pf.car_id = c.id
);

grant select on public.car_likes to anon, authenticated;
grant select on public.car_saves to anon, authenticated;
grant select on public.project_follows to anon, authenticated;
grant insert, delete on public.car_likes to authenticated;
grant insert, delete on public.car_saves to authenticated;
grant insert, delete on public.project_follows to authenticated;
grant execute on function public.increment_car_view(uuid) to anon, authenticated;
grant execute on function public.refresh_project_followers_count(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
