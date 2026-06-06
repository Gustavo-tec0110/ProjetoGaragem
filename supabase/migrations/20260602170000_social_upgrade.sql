begin;

alter table public.profiles
  add column if not exists instagram_handle text;

alter table public.cars
  add column if not exists project_status text,
  add column if not exists progress_percent integer,
  add column if not exists mileage_km integer,
  add column if not exists torque_nm integer,
  add column if not exists weight_kg integer,
  add column if not exists started_at date,
  add column if not exists project_goal text,
  add column if not exists tags text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cars_project_status_chk'
  ) then
    alter table public.cars
      add constraint cars_project_status_chk
      check (
        project_status is null
        or project_status in ('Planejamento', 'Em andamento', 'Quase pronto', 'Finalizado')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_progress_percent_chk'
  ) then
    alter table public.cars
      add constraint cars_progress_percent_chk
      check (progress_percent is null or progress_percent between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_metric_non_negative_chk'
  ) then
    alter table public.cars
      add constraint cars_metric_non_negative_chk
      check (
        mileage_km is null or mileage_km >= 0
      )
      not valid;
  end if;
end $$;

alter table public.cars validate constraint cars_metric_non_negative_chk;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cars_weight_non_negative_chk'
  ) then
    alter table public.cars
      add constraint cars_weight_non_negative_chk
      check (weight_kg is null or weight_kg >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_torque_non_negative_chk'
  ) then
    alter table public.cars
      add constraint cars_torque_non_negative_chk
      check (torque_nm is null or torque_nm >= 0);
  end if;
end $$;

create table if not exists public.car_build_updates (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  happened_at date not null default current_date,
  amount_spent integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_build_updates_title_chk check (char_length(trim(title)) between 3 and 160),
  constraint car_build_updates_amount_chk check (amount_spent is null or amount_spent >= 0)
);

create table if not exists public.car_expenses (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  name text not null,
  category text not null,
  amount integer not null,
  spent_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_expenses_name_chk check (char_length(trim(name)) between 2 and 160),
  constraint car_expenses_amount_chk check (amount >= 0),
  constraint car_expenses_category_chk check (
    category in ('Motor', 'Suspensao', 'Rodas', 'Freios', 'Estetica', 'Interior', 'Som', 'Eletrica', 'Outros')
  )
);

create index if not exists idx_cars_project_status on public.cars (project_status);
create index if not exists idx_cars_started_at on public.cars (started_at desc);
create index if not exists idx_cars_tags on public.cars using gin (tags);
create index if not exists idx_car_build_updates_car_id on public.car_build_updates (car_id, happened_at desc);
create index if not exists idx_car_expenses_car_id on public.car_expenses (car_id, spent_at desc);

drop trigger if exists trg_car_build_updates_updated_at on public.car_build_updates;
create trigger trg_car_build_updates_updated_at
before update on public.car_build_updates
for each row execute function public.set_updated_at();

drop trigger if exists trg_car_expenses_updated_at on public.car_expenses;
create trigger trg_car_expenses_updated_at
before update on public.car_expenses
for each row execute function public.set_updated_at();

alter table public.car_build_updates enable row level security;
alter table public.car_expenses enable row level security;

drop policy if exists "car_build_updates_read_public_or_owner" on public.car_build_updates;
create policy "car_build_updates_read_public_or_owner" on public.car_build_updates
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_build_updates_write_owner" on public.car_build_updates;
create policy "car_build_updates_write_owner" on public.car_build_updates
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "car_expenses_read_public_or_owner" on public.car_expenses;
create policy "car_expenses_read_public_or_owner" on public.car_expenses
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_expenses_write_owner" on public.car_expenses;
create policy "car_expenses_write_owner" on public.car_expenses
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

grant select on
  public.car_build_updates,
  public.car_expenses
to anon, authenticated;

grant insert, update, delete on
  public.car_build_updates,
  public.car_expenses
to authenticated;

commit;
