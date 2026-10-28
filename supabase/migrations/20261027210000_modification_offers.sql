-- Prepared locally only. Contains no demo data and never changes catalog records.
begin;

create table public.modification_offers (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.modification_catalog(id) on delete cascade,
  store text not null check (store in ('mercado_livre', 'shopee', 'amazon')),
  destination_url text not null,
  is_active boolean not null default true,
  is_affiliate boolean not null default true,
  price numeric(12,2) check (price > 0 and price != 'NaN'::numeric),
  price_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint modification_offers_price_pair_check check ((price is null) = (price_checked_at is null)),
  constraint modification_offers_safe_url check (
    length(destination_url) <= 2048 and destination_url !~ '[[:space:][:cntrl:]\\]'
    and case store
      when 'mercado_livre' then destination_url ~ '^https://([a-z0-9-]+\.)*(mercadolivre\.com\.br|mercadolivre\.com|meli\.la)([/?#]|$)'
      when 'shopee' then destination_url ~ '^https://([a-z0-9-]+\.)*(shopee\.com\.br|shope\.ee)([/?#]|$)'
      when 'amazon' then destination_url ~ '^https://([a-z0-9-]+\.)*(amazon\.com\.br|amzn\.to)([/?#]|$)'
      else false
    end
  )
);
create index modification_offers_active_catalog_idx on public.modification_offers(catalog_id, created_at) where is_active;
create trigger modification_offers_updated_at before update on public.modification_offers
  for each row execute function public.set_updated_at();
alter table public.modification_offers enable row level security;
revoke all on public.modification_offers from public, anon, authenticated;
grant select on public.modification_offers to anon, authenticated;
grant all on public.modification_offers to service_role;
create policy modification_offers_public_read on public.modification_offers for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.modification_catalog c
    join public.modification_categories category on category.id = c.category_id
    where c.id = catalog_id and c.is_active and category.is_active
  ));
-- No visitor write policies or write grants. Maintained through trusted server/admin tooling only.
commit;
