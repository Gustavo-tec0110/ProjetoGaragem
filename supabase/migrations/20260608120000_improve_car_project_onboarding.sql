begin;

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
  add column if not exists catalog_version_id uuid references public.car_catalog_versions(id) on delete set null,
  add column if not exists version_confidence text not null default 'unknown',
  add column if not exists factory_spec_confidence text not null default 'estimated',
  add column if not exists factory_specs_note text,
  add column if not exists spec_confidence_percent integer not null default 20,
  add column if not exists original_engine_answer text not null default 'unknown',
  add column if not exists original_induction_answer text not null default 'unknown',
  add column if not exists current_induction text,
  add column if not exists original_color_answer text not null default 'unknown',
  add column if not exists original_wheels_answer text not null default 'unknown',
  add column if not exists original_interior_answer text not null default 'unknown',
  add column if not exists original_suspension_answer text not null default 'unknown';

do $$
begin
  alter table public.cars drop constraint if exists cars_version_confidence_chk;
  alter table public.cars
    add constraint cars_version_confidence_chk
    check (version_confidence in ('confirmed', 'unknown', 'estimated'));

  alter table public.cars drop constraint if exists cars_factory_spec_confidence_chk;
  alter table public.cars
    add constraint cars_factory_spec_confidence_chk
    check (factory_spec_confidence in ('confirmed', 'unknown', 'estimated'));

  alter table public.cars drop constraint if exists cars_spec_confidence_percent_chk;
  alter table public.cars
    add constraint cars_spec_confidence_percent_chk
    check (spec_confidence_percent between 0 and 100);

  alter table public.cars drop constraint if exists cars_detail_answers_chk;
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
end $$;

create index if not exists idx_car_catalog_models_lookup
  on public.car_catalog_models (brand, model, year_start, year_end);
create index if not exists idx_car_catalog_versions_model_year
  on public.car_catalog_versions (model_id, year_start, year_end);
create index if not exists idx_cars_catalog_version_id
  on public.cars (catalog_version_id);

alter table public.car_catalog_models enable row level security;
alter table public.car_catalog_versions enable row level security;

drop policy if exists "car_catalog_models_read_all" on public.car_catalog_models;
create policy "car_catalog_models_read_all" on public.car_catalog_models
for select to anon, authenticated using (true);

drop policy if exists "car_catalog_versions_read_all" on public.car_catalog_versions;
create policy "car_catalog_versions_read_all" on public.car_catalog_versions
for select to anon, authenticated using (true);

with model_seed (brand, model, generation_name, year_start, year_end, notes) as (
  values
    ('Volkswagen', 'Gol', 'Quadrado', 1980, 1994, 'Dados iniciais aproximados para orientar cadastro; podem variar por mercado e configuracao.'),
    ('Fiat', 'Uno', 'Primeira geracao', 1984, 2013, 'Dados iniciais aproximados; versoes populares variam por ano e combustivel.'),
    ('Chevrolet', 'Opala', 'Nacional', 1968, 1992, 'Dados iniciais aproximados para versoes conhecidas; consultar documentacao do veiculo.'),
    ('Chevrolet', 'Kadett', 'Nacional', 1989, 1998, 'Dados iniciais aproximados; alguns motores e injecoes mudaram por ano.'),
    ('Chevrolet', 'Chevette', 'Nacional', 1973, 1993, 'Dados iniciais aproximados; potencia e carburacao variam por ano.')
)
insert into public.car_catalog_models (brand, model, generation_name, year_start, year_end, notes)
select brand, model, generation_name, year_start, year_end, notes
from model_seed
on conflict (brand, model, generation_name, year_start, year_end) do update set
  notes = excluded.notes,
  updated_at = now();

with version_seed (
  brand,
  model,
  generation_name,
  version,
  year_start,
  year_end,
  engine_original,
  induction_original,
  power_hp,
  drivetrain,
  transmission,
  fuel_type,
  notes,
  is_estimated
) as (
  values
    ('Volkswagen', 'Gol', 'Quadrado', 'CL', 1991, 1994, 'AP 1.6 ou AP 1.8 dependendo da configuracao', 'Carburador', 86, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Referencia aproximada; motorizacao pode variar por ano e mercado.', true),
    ('Volkswagen', 'Gol', 'Quadrado', 'GL', 1991, 1994, 'AP 1.8', 'Carburador', 95, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Referencia aproximada; conferir documento e plaqueta do veiculo.', true),
    ('Volkswagen', 'Gol', 'Quadrado', 'GTS', 1987, 1994, 'AP 1.8', 'Carburador', 99, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados para Gol GTS de fim de serie.', true),
    ('Volkswagen', 'Gol', 'Quadrado', 'GTI', 1989, 1994, 'AP 2.0', 'Injecao eletronica', 120, 'Dianteira', 'Manual', 'Gasolina', 'Dados aproximados; conferir ano/modelo exato.', true),
    ('Fiat', 'Uno', 'Primeira geracao', 'Mille', 1990, 1996, 'Fiasa 1.0', 'Carburador', 48, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados de Uno Mille inicial.', true),
    ('Fiat', 'Uno', 'Primeira geracao', 'CS', 1984, 1994, 'Fiasa 1.3 ou 1.5 dependendo do ano', 'Carburador', 71, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados variam bastante por ano e mercado.', true),
    ('Fiat', 'Uno', 'Primeira geracao', '1.5R', 1987, 1989, 'Fiasa 1.5', 'Carburador', 86, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Referencia aproximada para versao esportiva.', true),
    ('Chevrolet', 'Opala', 'Nacional', 'Especial', 1969, 1979, '4 cilindros 2.5 ou 6 cilindros 3.8/4.1', 'Carburador', 80, 'Traseira', 'Manual', 'Gasolina/alcool', 'Dados muito dependentes de ano e motor.', true),
    ('Chevrolet', 'Opala', 'Nacional', 'Comodoro', 1975, 1992, '4.1 seis cilindros ou 2.5 quatro cilindros', 'Carburador', 121, 'Traseira', 'Manual/automatico', 'Gasolina/alcool', 'Referencia aproximada; confirmar motor original.', true),
    ('Chevrolet', 'Opala', 'Nacional', 'Diplomata', 1980, 1992, '4.1 seis cilindros', 'Carburador', 121, 'Traseira', 'Manual/automatico', 'Gasolina/alcool', 'Referencia aproximada para modelos de luxo.', true),
    ('Chevrolet', 'Kadett', 'Nacional', 'SL', 1989, 1993, '1.8', 'Carburador', 95, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados.', true),
    ('Chevrolet', 'Kadett', 'Nacional', 'GL', 1994, 1998, '1.8 ou 2.0 dependendo do ano', 'Injecao eletronica', 110, 'Dianteira', 'Manual', 'Gasolina/alcool', 'Dados aproximados; conferir ano exato.', true),
    ('Chevrolet', 'Kadett', 'Nacional', 'GSi', 1991, 1995, '2.0', 'Injecao eletronica', 121, 'Dianteira', 'Manual', 'Gasolina', 'Referencia aproximada para GSi.', true),
    ('Chevrolet', 'Chevette', 'Nacional', 'SL', 1978, 1993, '1.4 ou 1.6 dependendo do ano', 'Carburador', 68, 'Traseira', 'Manual', 'Gasolina/alcool', 'Dados aproximados.', true),
    ('Chevrolet', 'Chevette', 'Nacional', 'SE', 1987, 1993, '1.6/S', 'Carburador', 73, 'Traseira', 'Manual', 'Gasolina/alcool', 'Dados aproximados; conferir configuracao.', true),
    ('Chevrolet', 'Chevette', 'Nacional', 'GP/SR', 1976, 1981, '1.4', 'Carburador', 69, 'Traseira', 'Manual', 'Gasolina', 'Referencia aproximada para versoes esportivas antigas.', true)
)
insert into public.car_catalog_versions (
  model_id,
  version,
  year_start,
  year_end,
  engine_original,
  induction_original,
  power_hp,
  drivetrain,
  transmission,
  fuel_type,
  notes,
  is_estimated
)
select
  m.id,
  v.version,
  v.year_start,
  v.year_end,
  v.engine_original,
  v.induction_original,
  v.power_hp,
  v.drivetrain,
  v.transmission,
  v.fuel_type,
  v.notes,
  v.is_estimated
from version_seed v
join public.car_catalog_models m
  on m.brand = v.brand
  and m.model = v.model
  and m.generation_name = v.generation_name
on conflict (model_id, version, year_start, year_end) do update set
  engine_original = excluded.engine_original,
  induction_original = excluded.induction_original,
  power_hp = excluded.power_hp,
  drivetrain = excluded.drivetrain,
  transmission = excluded.transmission,
  fuel_type = excluded.fuel_type,
  notes = excluded.notes,
  is_estimated = excluded.is_estimated,
  updated_at = now();

grant select on public.car_catalog_models, public.car_catalog_versions to anon, authenticated;

notify pgrst, 'reload schema';

commit;
