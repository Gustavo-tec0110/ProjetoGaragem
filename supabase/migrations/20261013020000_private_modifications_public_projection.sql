-- Deploy together with the application that reads list_public_project_modifications.
-- The old `note` remains private; existing notes are never copied to a public field.
begin;

-- New project expenses are private unless the owner opts in at both levels.
alter table public.cars alter column show_expenses_public set default false;
alter table public.car_expenses alter column is_public set default false;

alter table public.project_modifications
  add column if not exists public_description text,
  add column if not exists show_paid_amount boolean not null default false;

alter table public.project_modifications
  drop constraint if exists project_modifications_public_description_chk;
alter table public.project_modifications
  add constraint project_modifications_public_description_chk
  check (public_description is null or char_length(trim(public_description)) <= 1000);

-- A row policy cannot redact columns. Direct reads are restricted to the owner.
alter table public.project_modifications enable row level security;
drop policy if exists "project_modifications_read_public_or_owner" on public.project_modifications;
drop policy if exists "project_modifications_read_owner" on public.project_modifications;
create policy "project_modifications_read_owner" on public.project_modifications
  for select to authenticated using (
    exists (select 1 from public.cars c
      where c.id = project_modifications.car_id and c.owner_id = (select auth.uid()))
  );
-- Restrictive guards also constrain legacy permissive FOR ALL policies.
drop policy if exists "project_modifications_private_read_guard" on public.project_modifications;
create policy "project_modifications_private_read_guard" on public.project_modifications
  as restrictive for select to authenticated using (
    exists (select 1 from public.cars c
      where c.id = project_modifications.car_id and c.owner_id = (select auth.uid()))
  );
revoke select on public.project_modifications from anon;

-- Build updates also contain an unconsented amount_spent column.
alter table public.car_build_updates enable row level security;
drop policy if exists "car_build_updates_read_public_or_owner" on public.car_build_updates;
drop policy if exists "car_build_updates_read_owner" on public.car_build_updates;
create policy "car_build_updates_read_owner" on public.car_build_updates
  for select to authenticated using (
    exists (select 1 from public.cars c
      where c.id = car_build_updates.car_id and c.owner_id = (select auth.uid()))
  );
drop policy if exists "car_build_updates_private_read_guard" on public.car_build_updates;
create policy "car_build_updates_private_read_guard" on public.car_build_updates
  as restrictive for select to authenticated using (
    exists (select 1 from public.cars c
      where c.id = car_build_updates.car_id and c.owner_id = (select auth.uid()))
  );
revoke select on public.car_build_updates from anon;
create or replace function public.list_public_car_build_updates(p_car_ids uuid[])
returns table (
  id uuid, car_id uuid, title text, description text, photo_url text,
  photo_urls text[], category text, happened_at date, amount_spent integer,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.car_id, u.title, u.description, u.photo_url, u.photo_urls,
    u.category, u.happened_at, null::integer,
    u.created_at, u.updated_at
  from public.car_build_updates u
  join public.cars c on c.id = u.car_id
  where u.car_id = any(p_car_ids) and c.is_public is true;
$$;
revoke all on function public.list_public_car_build_updates(uuid[]) from public;
grant execute on function public.list_public_car_build_updates(uuid[]) to anon, authenticated;

-- Publishing an expense amount must never publish its owner's personal note.
alter table public.car_expenses enable row level security;
drop policy if exists "car_expenses_read_public_or_owner" on public.car_expenses;
drop policy if exists "car_expenses_read_owner" on public.car_expenses;
create policy "car_expenses_read_owner" on public.car_expenses
  for select to authenticated using (
    exists (select 1 from public.cars c where c.id = car_expenses.car_id and c.owner_id = (select auth.uid()))
  );
drop policy if exists "car_expenses_private_read_guard" on public.car_expenses;
create policy "car_expenses_private_read_guard" on public.car_expenses
  as restrictive for select to authenticated using (
    exists (select 1 from public.cars c where c.id = car_expenses.car_id and c.owner_id = (select auth.uid()))
  );
revoke select on public.car_expenses from anon;
create or replace function public.list_public_car_expenses(p_car_ids uuid[])
returns table (
  id uuid, car_id uuid, name text, category text, amount integer, spent_at date,
  note text, part_id uuid, part_name text, is_public boolean,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.car_id, e.name, e.category, e.amount, e.spent_at,
    null::text, null::uuid, e.part_name, e.is_public, e.created_at, e.updated_at
  from public.car_expenses e join public.cars c on c.id = e.car_id
  where e.car_id = any(p_car_ids) and c.is_public is true
    and c.show_expenses_public is true and e.is_public is true;
$$;
revoke all on function public.list_public_car_expenses(uuid[]) from public;
grant execute on function public.list_public_car_expenses(uuid[]) to anon, authenticated;

-- A SECURITY DEFINER function has an explicit public-project predicate and a
-- fixed result shape. The caller cannot choose rows or private columns.
create or replace function public.list_public_project_modifications(p_car_id uuid)
returns table (
  id uuid, car_id uuid, catalog_id uuid, status text,
  paid_amount integer, public_description text, project_photo_url text,
  installed_at date, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.car_id, m.catalog_id, m.status,
    case when m.show_paid_amount then m.paid_amount else null end,
    m.public_description, m.project_photo_url,
    m.installed_at, m.created_at, m.updated_at
  from public.project_modifications m
  join public.cars c on c.id = m.car_id
  where m.car_id = p_car_id and c.is_public is true
  order by m.created_at desc;
$$;
revoke all on function public.list_public_project_modifications(uuid) from public;
grant execute on function public.list_public_project_modifications(uuid) to anon, authenticated;

commit;
