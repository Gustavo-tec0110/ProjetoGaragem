-- LOCAL ONLY. Additive review metadata; no seeds, remote execution, auth changes or RLS changes.
begin;
alter table public.modification_offers
  add column product_name text,
  add column product_url text,
  add column compatibility_notes text,
  add column verified_at timestamptz,
  add column source text not null default 'manual',
  add column source_product_id text;

alter table public.modification_offers drop constraint modification_offers_store_check;
alter table public.modification_offers add constraint modification_offers_store_check
  check (store in ('mercado_livre', 'shopee', 'amazon', 'magalu'));
alter table public.modification_offers drop constraint modification_offers_safe_url;
alter table public.modification_offers add constraint modification_offers_safe_url check (
  length(destination_url) <= 2048 and destination_url !~ '[[:space:][:cntrl:]\\]'
  and case store
    when 'mercado_livre' then destination_url ~ '^https://([a-z0-9-]+\.)*(mercadolivre\.com\.br|mercadolivre\.com|meli\.la)([/?#]|$)'
    when 'shopee' then destination_url ~ '^https://([a-z0-9-]+\.)*(shopee\.com\.br|shope\.ee)([/?#]|$)'
    when 'amazon' then destination_url ~ '^https://([a-z0-9-]+\.)*(amazon\.com\.br|amzn\.to)([/?#]|$)'
    when 'magalu' then destination_url ~ '^https://([a-z0-9-]+\.)*(magazineluiza\.com\.br|magazinevoce\.com\.br)([/?#]|$)' or destination_url ~ '^https://magazineluiza\.onelink\.me([/?#]|$)'
    else false
  end
);
alter table public.modification_offers add constraint modification_offers_product_url_check check (
  product_url is null or (
    length(product_url) <= 2048 and product_url !~ '[[:space:][:cntrl:]\\]'
    and case store
      when 'mercado_livre' then product_url ~ '^https://([a-z0-9-]+\.)*(mercadolivre\.com\.br|mercadolivre\.com|meli\.la)([/?#]|$)'
      when 'shopee' then product_url ~ '^https://([a-z0-9-]+\.)*(shopee\.com\.br|shope\.ee)([/?#]|$)'
      when 'amazon' then product_url ~ '^https://([a-z0-9-]+\.)*(amazon\.com\.br|amzn\.to)([/?#]|$)'
      when 'magalu' then product_url ~ '^https://([a-z0-9-]+\.)*(magazineluiza\.com\.br|magazinevoce\.com\.br)([/?#]|$)' or product_url ~ '^https://magazineluiza\.onelink\.me([/?#]|$)'
      else false
    end
  )
);
alter table public.modification_offers
  add constraint modification_offers_review_check check (
    verified_at is null or (product_name is not null and length(trim(product_name)) between 2 and 180
      and product_url is not null and compatibility_notes is not null and length(trim(compatibility_notes)) between 2 and 1000)
  ),
  add constraint modification_offers_source_check check (source in ('manual', 'official_api')),
  add constraint modification_offers_source_product_check check (source_product_id is null or length(source_product_id) <= 180);
-- Existing rows are preserved. The public API hides unreviewed offers until individually reviewed.
commit;
