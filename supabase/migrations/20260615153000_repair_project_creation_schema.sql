begin;

-- Repairs production drift that blocks POST /criar-projeto.
-- It intentionally avoids storage bucket changes; project image upload is handled elsewhere.

create table if not exists public.car_catalog_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  generation_name text,
  year_start integer not null,
  year_end integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_catalog_models_years_chk check (year_start between 1900 and 2100 and year_end between year_start and 2100),
  constraint car_catalog_models_unique unique (brand, model, generation_name, year_start, year_end)
);

create table if not exists public.car_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.car_catalog_models(id) on delete cascade,
  version text not null,
  year_start integer not null,
  year_end integer not null,
  engine_original text,
  induction_original text,
  power_hp integer,
  drivetrain text,
  transmission text,
  fuel_type text,
  notes text,
  is_estimated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_catalog_versions_years_chk check (year_start between 1900 and 2100 and year_end between year_start and 2100),
  constraint car_catalog_versions_unique unique (model_id, version, year_start, year_end)
);

alter table public.cars
  add column if not exists catalog_version_id uuid,
  add column if not exists version text,
  add column if not exists version_confidence text not null default 'unknown',
  add column if not exists factory_spec_confidence text not null default 'estimated',
  add column if not exists factory_specs_note text,
  add column if not exists factory_engine text,
  add column if not exists factory_induction text,
  add column if not exists factory_power_cv integer,
  add column if not exists factory_transmission text,
  add column if not exists factory_drivetrain text,
  add column if not exists spec_confidence_percent integer not null default 20,
  add column if not exists original_engine_answer text not null default 'unknown',
  add column if not exists original_induction_answer text not null default 'unknown',
  add column if not exists current_induction text,
  add column if not exists original_color_answer text not null default 'unknown',
  add column if not exists original_wheels_answer text not null default 'unknown',
  add column if not exists original_interior_answer text not null default 'unknown',
  add column if not exists original_suspension_answer text not null default 'unknown',
  add column if not exists photo_urls text[] not null default '{}'::text[],
  add column if not exists torque_nm integer,
  add column if not exists weight_kg integer,
  add column if not exists mileage_km integer,
  add column if not exists project_status text,
  add column if not exists progress_percent integer,
  add column if not exists started_at date,
  add column if not exists project_goal text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists show_expenses_public boolean not null default true,
  add column if not exists project_followers_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.cars'::regclass
      and conname = 'cars_catalog_version_id_fkey'
  ) then
    alter table public.cars
      add constraint cars_catalog_version_id_fkey
      foreign key (catalog_version_id)
      references public.car_catalog_versions(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_version_confidence_chk'
  ) then
    alter table public.cars
      add constraint cars_version_confidence_chk
      check (version_confidence in ('confirmed', 'unknown', 'estimated'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_factory_spec_confidence_chk'
  ) then
    alter table public.cars
      add constraint cars_factory_spec_confidence_chk
      check (factory_spec_confidence in ('confirmed', 'unknown', 'estimated'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_spec_confidence_percent_chk'
  ) then
    alter table public.cars
      add constraint cars_spec_confidence_percent_chk
      check (spec_confidence_percent between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_detail_answers_chk'
  ) then
    alter table public.cars
      add constraint cars_detail_answers_chk
      check (
        original_engine_answer in ('yes', 'no', 'unknown')
        and original_induction_answer in ('yes', 'no', 'unknown')
        and original_color_answer in ('yes', 'no', 'unknown')
        and original_wheels_answer in ('yes', 'no', 'unknown')
        and original_interior_answer in ('yes', 'no', 'unknown')
        and original_suspension_answer in ('yes', 'no', 'unknown')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cars_project_followers_count_chk'
  ) then
    alter table public.cars
      add constraint cars_project_followers_count_chk
      check (project_followers_count >= 0);
  end if;
end $$;

alter table public.car_photos
  add column if not exists storage_path text,
  add column if not exists width integer,
  add column if not exists height integer;

alter table public.car_parts
  add column if not exists installed_at date,
  add column if not exists image_url text,
  add column if not exists storage_path text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.car_parts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
      and pg_get_constraintdef(oid) ilike '%installed%'
      and pg_get_constraintdef(oid) ilike '%planned%'
  loop
    execute format('alter table public.car_parts drop constraint if exists %I', constraint_name);
  end loop;

  alter table public.car_parts
    add constraint car_parts_status_chk
    check (status in ('installed', 'planned', 'removed'));
end $$;

alter table public.car_build_updates
  add column if not exists photo_urls text[] not null default '{}'::text[],
  add column if not exists category text not null default 'outro';

do $$
begin
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

alter table public.car_expenses
  add column if not exists note text,
  add column if not exists part_id uuid references public.car_parts(id) on delete set null,
  add column if not exists part_name text,
  add column if not exists is_public boolean not null default true;

do $$
begin
  alter table public.car_expenses drop constraint if exists car_expenses_category_chk;
  alter table public.car_expenses
    add constraint car_expenses_category_chk
    check (
      category in (
        'Motor',
        'Suspensao',
        'Suspensão',
        'Rodas',
        'Freios',
        'Estetica',
        'Estética',
        'Interior',
        'Som',
        'Eletrica',
        'Elétrica',
        'Outros'
      )
    );
end $$;

create index if not exists idx_car_catalog_models_lookup
  on public.car_catalog_models (brand, model, year_start, year_end);
create index if not exists idx_car_catalog_versions_model_year
  on public.car_catalog_versions (model_id, year_start, year_end);
create index if not exists idx_cars_catalog_version_id
  on public.cars (catalog_version_id);
create index if not exists idx_cars_project_followers_count
  on public.cars (project_followers_count desc);
create index if not exists idx_car_build_updates_category
  on public.car_build_updates (category);
create index if not exists idx_car_expenses_public
  on public.car_expenses (car_id, is_public, spent_at desc);
create index if not exists idx_car_parts_status_category
  on public.car_parts (car_id, status, category);

alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.car_photos enable row level security;
alter table public.car_parts enable row level security;
alter table public.car_build_updates enable row level security;
alter table public.car_expenses enable row level security;
alter table public.car_catalog_models enable row level security;
alter table public.car_catalog_versions enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
for select to anon, authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "cars_read_public_or_owner" on public.cars;
create policy "cars_read_public_or_owner" on public.cars
for select to anon, authenticated using (is_public = true or owner_id = auth.uid());

drop policy if exists "cars_insert_own" on public.cars;
create policy "cars_insert_own" on public.cars
for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "cars_update_own" on public.cars;
create policy "cars_update_own" on public.cars
for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "cars_delete_own" on public.cars;
create policy "cars_delete_own" on public.cars
for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "car_photos_read_public_or_owner" on public.car_photos;
create policy "car_photos_read_public_or_owner" on public.car_photos
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_photos_write_owner" on public.car_photos;
create policy "car_photos_write_owner" on public.car_photos
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "car_parts_read_public_or_owner" on public.car_parts;
create policy "car_parts_read_public_or_owner" on public.car_parts
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = car_id and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_parts_write_owner" on public.car_parts;
create policy "car_parts_write_owner" on public.car_parts
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

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
    where c.id = car_id
      and (
        c.owner_id = auth.uid()
        or (c.is_public = true and c.show_expenses_public = true and is_public = true)
      )
  )
);

drop policy if exists "car_expenses_write_owner" on public.car_expenses;
create policy "car_expenses_write_owner" on public.car_expenses
for all to authenticated using (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.cars c where c.id = car_id and c.owner_id = auth.uid())
);

drop policy if exists "car_catalog_models_read_all" on public.car_catalog_models;
create policy "car_catalog_models_read_all" on public.car_catalog_models
for select to anon, authenticated using (true);

drop policy if exists "car_catalog_versions_read_all" on public.car_catalog_versions;
create policy "car_catalog_versions_read_all" on public.car_catalog_versions
for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;

grant select on
  public.profiles,
  public.cars,
  public.car_photos,
  public.car_parts,
  public.car_build_updates,
  public.car_expenses,
  public.car_catalog_models,
  public.car_catalog_versions
to anon, authenticated;

grant insert, update on public.profiles to authenticated;

grant insert, update, delete on
  public.cars,
  public.car_photos,
  public.car_parts,
  public.car_build_updates,
  public.car_expenses
to authenticated;

notify pgrst, 'reload schema';

commit;
