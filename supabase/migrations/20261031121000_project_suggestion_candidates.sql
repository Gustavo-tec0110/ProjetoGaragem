begin;

-- Same NFD/ASCII normalization as the suggestions UI, including # and accents.
-- Do not replace the separate explore RPC's semantics or add speculative synonyms.
create function public.project_suggestion_normalize(value text) returns text
language sql immutable parallel safe security invoker as $$
  select trim(regexp_replace(lower(regexp_replace(normalize(coalesce(value,''), NFD),
    U&'[\0300-\036f]', '', 'g')), '[^a-z0-9]+', ' ', 'g'));
$$;

-- All inputs have fixed text/integer/text[] types: this document is deterministic.
create function public.project_suggestion_document(
  name text, brand text, model text, year integer, category text, engine text,
  description text, tags text[]
) returns text language sql immutable parallel safe security invoker as $$
  select public.project_suggestion_normalize(concat_ws(' ',name,brand,model,year::text,
    category,engine,description,array_to_string(tags,' ')));
$$;

-- RLS prevents pushing LIKE through the cars visibility barrier. Index a narrow
-- public document projection instead; never mark user predicates LEAKPROOF or
-- weaken cars RLS. Still join cars below to recheck visibility on every request.
create schema search_support;
revoke all on schema search_support from public;
grant usage on schema search_support to anon,authenticated;
create table search_support.public_project_documents (
  car_id uuid primary key references public.cars(id) on delete cascade,
  document text not null,
  search_name text not null, search_brand text not null, search_model text not null,
  search_engine text not null, search_description text not null, search_tags text[] not null
);
alter table search_support.public_project_documents enable row level security;
revoke all on search_support.public_project_documents from public,anon,authenticated;
grant select on search_support.public_project_documents to anon,authenticated;
create policy public_documents_read on search_support.public_project_documents for select to anon,authenticated using (true);
create function search_support.sync_public_project_document() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.is_public then
    insert into search_support.public_project_documents(car_id,document,search_name,search_brand,search_model,search_engine,search_description,search_tags)
      values(new.id,public.project_suggestion_document(new.name,new.brand,new.model,new.year,
        new.category,new.engine,new.description,new.tags),public.project_suggestion_normalize(new.name),
        public.project_suggestion_normalize(new.brand),public.project_suggestion_normalize(new.model),
        public.project_suggestion_normalize(new.engine),public.project_suggestion_normalize(new.description),
        array(select public.project_suggestion_normalize(t) from unnest(new.tags) t where nullif(trim(t),'') is not null))
      on conflict(car_id) do update set document=excluded.document,search_name=excluded.search_name,
        search_brand=excluded.search_brand,search_model=excluded.search_model,search_engine=excluded.search_engine,
        search_description=excluded.search_description,search_tags=excluded.search_tags;
  else
    delete from search_support.public_project_documents where car_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function search_support.sync_public_project_document() from public,anon,authenticated;
create trigger sync_public_project_document after insert or update of
  name,brand,model,year,category,engine,description,tags,is_public on public.cars
  for each row execute function search_support.sync_public_project_document();
insert into search_support.public_project_documents(car_id,document,search_name,search_brand,search_model,search_engine,search_description,search_tags)
  select id,public.project_suggestion_document(name,brand,model,year,category,engine,description,tags),
    public.project_suggestion_normalize(name),public.project_suggestion_normalize(brand),
    public.project_suggestion_normalize(model),public.project_suggestion_normalize(engine),
    public.project_suggestion_normalize(description),
    array(select public.project_suggestion_normalize(t) from unnest(tags) t where nullif(trim(t),'') is not null)
  from public.cars where is_public;
do $$ declare extension_schema text; begin
  select n.nspname into strict extension_schema from pg_extension e
    join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm';
  execute format('create index public_project_documents_trgm on search_support.public_project_documents using gin (document %I.gin_trgm_ops)',extension_schema);
end $$;

create function public.project_search_suggestions(p_query text, p_limit integer default 8)
returns table(term text, source text, rank integer, project_slug text)
language sql stable security invoker set search_path = pg_catalog, public as $$
  with query as materialized (
    select public.project_suggestion_normalize(left(trim(coalesce(p_query,'')),80)) q,
      greatest(1,least(coalesce(p_limit,8),12)) result_limit
  ), matched as materialized (
    select c.*, q.q,
      d.search_name nn,d.search_model nm,d.search_brand nb,d.search_engine ne,
      d.search_description nd,d.search_tags nt
    from search_support.public_project_documents d join public.cars c on c.id=d.car_id cross join query q
    where c.is_public and char_length(trim(p_query)) >= 2 and q.q <> ''
      and d.document like '%' || q.q || '%'
  ), ranked as (
    select m.*,
      (project_followers_count::double precision*0.5 + likes_count::double precision*0.35
        + comments_count::double precision*0.25 + views_count::double precision*0.03
        + case when nn=q then 120 else 0 end
        + case when nm=q then 100 else 0 end
        + case when nb=q then 90 else 0 end
        + case when year::text=q then 80 else 0 end
        + case when q=any(nt) then 100 else 0 end
        + case when exists(select 1 from unnest(string_to_array(nn,' ')) w where starts_with(w,q)) then 70 else 0 end
        + case when exists(select 1 from unnest(string_to_array(nm,' ')) w where starts_with(w,q)) then 64 else 0 end
        + case when exists(select 1 from unnest(string_to_array(nb,' ')) w where starts_with(w,q)) then 52 else 0 end
        + case when strpos(nn,q)>0 then 40 else 0 end
        + case when strpos(nm,q)>0 then 36 else 0 end
        + case when strpos(nb,q)>0 then 28 else 0 end
        + case when strpos(ne,q)>0 then 26 else 0 end
        + case when exists(select 1 from unnest(nt) t where strpos(t,q)>0) then 34 else 0 end
        + case when strpos(nd,q)>0 then 10 else 0 end) raw_rank
    from matched m
  ), scored as materialized (
    -- Match JS Number arithmetic and Math.round, including floating boundaries.
    select r.*,(floor(raw_rank) + case when raw_rank-floor(raw_rank)>=0.5 then 1 else 0 end)::integer + 120 project_rank
    from ranked r
    order by project_rank desc,
      char_length(name) + char_length(regexp_replace(name,U&'[^\+010000-\+10ffff]','','g')),id
    limit (select result_limit from query)
  ), candidates as (
    select id, 0::bigint ord, name term, trim(brand || ' ' || model || ' ' || year) source,
      project_rank rank, slug project_slug, 'project:' || slug link_key from scored
    union all
    select m.id,v.ord,trim(v.term),v.source,v.rank + case
      when starts_with(public.project_suggestion_normalize(v.term),m.q) then 35 else 0 end,
      null::text,'term:' || trim(v.term)
    -- Every project scores >=120; every generic term scores <=115. Keeping
    -- the best result_limit projects cannot remove a term that would reach the top.
    from scored m cross join lateral (
      select * from (values
        (1::bigint,m.brand,'Marca',80),(2,m.model,'Modelo',78),(3,m.year::text,'Ano',70),
        (4,coalesce(m.engine,''),'Motor',68),(5,m.category,'Categoria',72)
      ) terms(ord,term,source,rank)
      union all
      select 5+ordinality,regexp_replace(t,'^#+',''),'Tag',76
      from unnest(m.tags) with ordinality tags(t,ordinality) where nullif(trim(t),'') is not null
    ) v
    where trim(v.term)<>'' and strpos(public.project_suggestion_normalize(v.term),m.q)>0
  ), unique_candidates as (
    select distinct on (source,public.project_suggestion_normalize(term),link_key) *
    from candidates order by source,public.project_suggestion_normalize(term),link_key,rank desc,id,ord
  )
  select term,source,rank,project_slug from unique_candidates
  order by rank desc,
    -- JS compares UTF-16 code units; supplementary characters occupy two units.
    char_length(term) + char_length(regexp_replace(term,U&'[^\+010000-\+10ffff]','','g')),
    id,ord
  limit (select result_limit from query);
$$;

revoke all on function public.project_search_suggestions(text,integer) from public;
grant execute on function public.project_search_suggestions(text,integer) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
