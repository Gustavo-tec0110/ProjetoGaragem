begin;

create table if not exists public.modification_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.modification_categories(id) on delete restrict,
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modification_categories_slug_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint modification_categories_name_chk check (char_length(trim(name)) between 2 and 80)
);

create table if not exists public.modification_catalog (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.modification_categories(id) on delete restrict,
  slug text not null unique,
  name text not null,
  short_description text,
  default_image_path text,
  estimated_price_min integer,
  estimated_price_max integer,
  compatibility_type text not null default 'universal',
  compatibility_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modification_catalog_slug_chk check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint modification_catalog_name_chk check (char_length(trim(name)) between 2 and 120),
  constraint modification_catalog_description_chk check (short_description is null or char_length(trim(short_description)) <= 500),
  constraint modification_catalog_price_chk check (
    (estimated_price_min is null or estimated_price_min >= 0)
    and (estimated_price_max is null or estimated_price_max >= 0)
    and (estimated_price_min is null or estimated_price_max is null or estimated_price_min <= estimated_price_max)
  ),
  constraint modification_catalog_compatibility_chk check (compatibility_type in ('universal', 'specific', 'adaptable'))
);

create table if not exists public.project_modifications (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  catalog_id uuid not null references public.modification_catalog(id) on delete restrict,
  status text not null default 'planned',
  paid_amount integer,
  note text,
  project_photo_url text,
  project_photo_storage_path text,
  installed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_modifications_status_chk check (status in ('installed', 'planned', 'wishlist', 'removed')),
  constraint project_modifications_paid_amount_chk check (paid_amount is null or paid_amount >= 0),
  constraint project_modifications_note_chk check (note is null or char_length(trim(note)) <= 1000),
  constraint project_modifications_photo_path_chk check (
    project_photo_storage_path is null
    or project_photo_storage_path ~ '^[0-9a-f-]{36}/modifications/[0-9a-f-]{36}\.webp$'
  )
);

create index if not exists modification_categories_parent_sort_idx
  on public.modification_categories (parent_id, sort_order, name);
create index if not exists modification_catalog_category_active_idx
  on public.modification_catalog (category_id, is_active, name);
create index if not exists project_modifications_car_status_idx
  on public.project_modifications (car_id, status, created_at desc);
create index if not exists project_modifications_catalog_idx
  on public.project_modifications (catalog_id);

drop trigger if exists trg_modification_categories_updated_at on public.modification_categories;
create trigger trg_modification_categories_updated_at
before update on public.modification_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_modification_catalog_updated_at on public.modification_catalog;
create trigger trg_modification_catalog_updated_at
before update on public.modification_catalog
for each row execute function public.set_updated_at();

drop trigger if exists trg_project_modifications_updated_at on public.project_modifications;
create trigger trg_project_modifications_updated_at
before update on public.project_modifications
for each row execute function public.set_updated_at();

alter table public.modification_categories enable row level security;
alter table public.modification_catalog enable row level security;
alter table public.project_modifications enable row level security;

drop policy if exists "modification_categories_read_active" on public.modification_categories;
create policy "modification_categories_read_active" on public.modification_categories
for select to anon, authenticated using (is_active = true);

drop policy if exists "modification_catalog_read_active" on public.modification_catalog;
create policy "modification_catalog_read_active" on public.modification_catalog
for select to anon, authenticated using (is_active = true);

drop policy if exists "project_modifications_read_public_or_owner" on public.project_modifications;
create policy "project_modifications_read_public_or_owner" on public.project_modifications
for select to anon, authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "project_modifications_insert_owner" on public.project_modifications;
create policy "project_modifications_insert_owner" on public.project_modifications
for insert to authenticated with check (
  public.enforce_action_rate_limit('project_update')
  and exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "project_modifications_update_owner" on public.project_modifications;
create policy "project_modifications_update_owner" on public.project_modifications
for update to authenticated using (
  exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id and c.owner_id = auth.uid()
  )
) with check (
  public.enforce_action_rate_limit('project_update')
  and exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id and c.owner_id = auth.uid()
  )
);

drop policy if exists "project_modifications_delete_owner" on public.project_modifications;
create policy "project_modifications_delete_owner" on public.project_modifications
for delete to authenticated using (
  public.enforce_action_rate_limit('project_update')
  and exists (
    select 1 from public.cars c
    where c.id = project_modifications.car_id and c.owner_id = auth.uid()
  )
);

grant select on public.modification_categories, public.modification_catalog to anon, authenticated;
grant select, insert, update, delete on public.project_modifications to authenticated;

insert into public.modification_categories (slug, name, sort_order)
values
  ('motor-performance', 'Motor / Performance', 10),
  ('suspensao', 'Suspensão', 20),
  ('freios', 'Freios', 30),
  ('rodas-pneus', 'Rodas e pneus', 40),
  ('transmissao', 'Transmissão', 50),
  ('interior', 'Interior', 60),
  ('exterior', 'Exterior', 70),
  ('iluminacao', 'Iluminação', 80),
  ('eletrica-eletronica', 'Elétrica / Eletrônica', 90),
  ('som', 'Som', 100)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.modification_catalog (category_id, slug, name)
select c.id, seed.slug, seed.name
from (values
  ('motor-performance', 'turbo', 'Turbo'), ('motor-performance', 'supercharger', 'Supercharger'), ('motor-performance', 'intercooler', 'Intercooler'), ('motor-performance', 'intake-filtro-esportivo', 'Intake / filtro esportivo'), ('motor-performance', 'coletor-admissao', 'Coletor de admissão'), ('motor-performance', 'coletor-escape', 'Coletor de escape'), ('motor-performance', 'downpipe', 'Downpipe'), ('motor-performance', 'escape', 'Escape'), ('motor-performance', 'bicos-injetores', 'Bicos injetores'), ('motor-performance', 'bomba-combustivel', 'Bomba de combustível'), ('motor-performance', 'regulador-pressao', 'Regulador de pressão'), ('motor-performance', 'ecu-modulo', 'ECU / módulo'), ('motor-performance', 'bobinas', 'Bobinas'), ('motor-performance', 'velas', 'Velas'), ('motor-performance', 'radiador', 'Radiador'), ('motor-performance', 'motor', 'Motor'), ('motor-performance', 'cabecote', 'Cabeçote'), ('motor-performance', 'comando', 'Comando'), ('motor-performance', 'pistoes-bielas', 'Pistões / bielas'),
  ('suspensao', 'coilover', 'Coilover'), ('suspensao', 'suspensao-rosca', 'Suspensão a rosca'), ('suspensao', 'suspensao-fixa', 'Suspensão fixa'), ('suspensao', 'molas', 'Molas'), ('suspensao', 'amortecedores', 'Amortecedores'), ('suspensao', 'barra-estabilizadora', 'Barra estabilizadora'), ('suspensao', 'buchas', 'Buchas'), ('suspensao', 'bracos', 'Braços'), ('suspensao', 'camber-alinhamento', 'Camber / alinhamento'), ('suspensao', 'reforcos-estruturais', 'Reforços estruturais'),
  ('freios', 'discos', 'Discos'), ('freios', 'pincas', 'Pinças'), ('freios', 'pastilhas', 'Pastilhas'), ('freios', 'mangueiras', 'Mangueiras'), ('freios', 'kit-freio', 'Kit de freio'),
  ('rodas-pneus', 'rodas', 'Rodas'), ('rodas-pneus', 'pneus', 'Pneus'), ('rodas-pneus', 'espacadores', 'Espaçadores'), ('rodas-pneus', 'adaptadores', 'Adaptadores'),
  ('transmissao', 'cambio', 'Câmbio'), ('transmissao', 'embreagem', 'Embreagem'), ('transmissao', 'diferencial', 'Diferencial'), ('transmissao', 'short-shifter', 'Short shifter'), ('transmissao', 'alavanca', 'Alavanca'), ('transmissao', 'relacoes-marcha', 'Relações de marcha'),
  ('interior', 'banco-esportivo', 'Banco esportivo'), ('interior', 'banco-concha', 'Banco concha'), ('interior', 'volante', 'Volante'), ('interior', 'manopla', 'Manopla'), ('interior', 'pedaleiras', 'Pedaleiras'), ('interior', 'cintos', 'Cintos'), ('interior', 'roll-cage', 'Roll cage'), ('interior', 'instrumentacao-interior', 'Instrumentação'), ('interior', 'shift-light', 'Shift light'), ('interior', 'painel-digital', 'Painel digital'),
  ('exterior', 'aerofolio', 'Aerofólio'), ('exterior', 'spoiler', 'Spoiler'), ('exterior', 'front-lip', 'Front lip'), ('exterior', 'side-skirts', 'Side skirts'), ('exterior', 'difusor', 'Difusor'), ('exterior', 'body-kit', 'Body kit'), ('exterior', 'capo', 'Capô'), ('exterior', 'para-choque', 'Para-choque'), ('exterior', 'retrovisores', 'Retrovisores'),
  ('iluminacao', 'farois', 'Faróis'), ('iluminacao', 'lanternas', 'Lanternas'), ('iluminacao', 'farois-auxiliares', 'Faróis auxiliares'), ('iluminacao', 'drl', 'DRL'), ('iluminacao', 'iluminacao-interna', 'Iluminação interna'),
  ('eletrica-eletronica', 'chicote', 'Chicote'), ('eletrica-eletronica', 'reles', 'Relés'), ('eletrica-eletronica', 'fusiveis', 'Fusíveis'), ('eletrica-eletronica', 'sensores', 'Sensores'), ('eletrica-eletronica', 'wideband', 'Wideband'), ('eletrica-eletronica', 'instrumentacao-eletrica', 'Instrumentação'), ('eletrica-eletronica', 'sistema-eletrico-customizado', 'Sistema elétrico customizado'),
  ('som', 'alto-falantes', 'Alto-falantes'), ('som', 'subwoofer', 'Subwoofer'), ('som', 'amplificador', 'Amplificador'), ('som', 'multimidia', 'Multimídia')
) as seed(category_slug, slug, name)
join public.modification_categories c on c.slug = seed.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  is_active = true;

commit;
