create extension if not exists pg_trgm;

create index if not exists idx_cars_tags_gin on public.cars using gin (tags);
create index if not exists idx_cars_name_trgm on public.cars using gin (lower(name) gin_trgm_ops);
create index if not exists idx_cars_brand_trgm on public.cars using gin (lower(brand) gin_trgm_ops);
create index if not exists idx_cars_model_trgm on public.cars using gin (lower(model) gin_trgm_ops);
create index if not exists idx_cars_engine_trgm on public.cars using gin (lower(coalesce(engine, '')) gin_trgm_ops);
create index if not exists idx_cars_description_trgm on public.cars using gin (lower(coalesce(description, '')) gin_trgm_ops);

create or replace function public.project_search_text(target public.cars)
returns text
language sql
stable
as $$
  select lower(
    concat_ws(
      ' ',
      target.name,
      target.brand,
      target.model,
      target.year::text,
      target.version,
      target.engine,
      target.factory_engine,
      target.current_induction,
      target.fuel_type,
      target.category,
      target.description,
      target.project_goal,
      array_to_string(coalesce(target.tags, '{}'::text[]), ' ')
    )
  );
$$;

create or replace function public.search_car_projects(
  p_query text default '',
  p_category text default null,
  p_engine text default null,
  p_tag text default null,
  p_limit integer default 120
)
returns table(car_id uuid, rank numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      lower(trim(coalesce(p_query, ''))) as query,
      lower(trim(coalesce(p_category, ''))) as category_filter,
      lower(trim(coalesce(p_engine, ''))) as engine_filter,
      lower(regexp_replace(trim(coalesce(p_tag, '')), '^#+', '')) as tag_filter,
      greatest(1, least(coalesce(p_limit, 120), 120)) as result_limit
  ),
  terms as (
    select regexp_split_to_table(query, '\s+') as term
    from normalized
    where query <> ''
  ),
  scored as (
    select
      c.id as car_id,
      (
        case when n.query <> '' and lower(c.name) = n.query then 120 else 0 end +
        case when n.query <> '' and lower(c.model) = n.query then 100 else 0 end +
        case when n.query <> '' and exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where lower(regexp_replace(tag, '^#+', '')) = regexp_replace(n.query, '^#+', '')
        ) then 100 else 0 end +
        case when n.query <> '' and lower(c.name) like '%' || n.query || '%' then 40 else 0 end +
        case when n.query <> '' and lower(c.model) like '%' || n.query || '%' then 36 else 0 end +
        case when n.query <> '' and lower(c.brand) like '%' || n.query || '%' then 28 else 0 end +
        case when n.query <> '' and lower(coalesce(c.engine, '')) like '%' || n.query || '%' then 26 else 0 end +
        case when n.query <> '' and exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where lower(regexp_replace(tag, '^#+', '')) like '%' || regexp_replace(n.query, '^#+', '') || '%'
        ) then 34 else 0 end +
        case when n.query <> '' and lower(coalesce(c.description, '')) like '%' || n.query || '%' then 10 else 0 end +
        c.project_followers_count * 0.4 +
        c.likes_count * 0.3 +
        c.views_count * 0.02
      )::numeric as rank
    from public.cars c
    cross join normalized n
    where c.is_public = true
      and (n.category_filter = '' or lower(c.category) = n.category_filter)
      and (n.engine_filter = '' or lower(coalesce(c.engine, '')) like '%' || n.engine_filter || '%')
      and (
        n.tag_filter = ''
        or exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where lower(regexp_replace(tag, '^#+', '')) like '%' || n.tag_filter || '%'
        )
      )
      and (
        n.query = ''
        or not exists (
          select 1
          from terms t
          where public.project_search_text(c) not like '%' || t.term || '%'
        )
      )
  )
  select scored.car_id, scored.rank
  from scored
  cross join normalized n
  order by
    case when n.query = '' then 0 else scored.rank end desc,
    scored.rank desc,
    scored.car_id
  limit (select result_limit from normalized);
$$;

create or replace function public.suggest_car_project_terms(
  p_query text,
  p_limit integer default 8
)
returns table(term text, source text, rank integer)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select lower(trim(coalesce(p_query, ''))) as query, greatest(1, least(coalesce(p_limit, 8), 12)) as result_limit
  ),
  candidates as (
    select brand as term, 'Marca' as source, 80 as base_rank from public.cars where is_public
    union all select model, 'Modelo', 78 from public.cars where is_public
    union all select name, 'Projeto', 74 from public.cars where is_public
    union all select coalesce(engine, ''), 'Motor', 68 from public.cars where is_public and coalesce(engine, '') <> ''
    union all
    select regexp_replace(tag, '^#+', ''), 'Tag', 76
    from public.cars, unnest(coalesce(tags, '{}'::text[])) tag
    where is_public and tag <> ''
  ),
  filtered as (
    select
      initcap(trim(term)) as term,
      source,
      max(base_rank + case when lower(term) like (select query from normalized) || '%' then 20 else 0 end) as rank
    from candidates, normalized
    where normalized.query <> ''
      and lower(term) like '%' || normalized.query || '%'
    group by initcap(trim(term)), source
  )
  select term, source, rank
  from filtered
  where term <> ''
  order by rank desc, length(term), term
  limit (select result_limit from normalized);
$$;

grant execute on function public.search_car_projects(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.suggest_car_project_terms(text, integer) to anon, authenticated;
