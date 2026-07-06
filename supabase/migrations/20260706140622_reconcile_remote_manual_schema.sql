begin;

set local search_path = public, extensions;

-- Reconcile the remote database that was created manually/schema-first after
-- marking the existing local migrations as applied. Keep this migration narrow:
-- no legacy seeds, no destructive DDL, and only idempotent corrections.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

alter table public.part_requirements
  add column if not exists deleted_at timestamptz default null;

create index if not exists idx_cars_tags_gin
  on public.cars using gin (tags);

create index if not exists idx_cars_name_trgm
  on public.cars using gin (lower(name) gin_trgm_ops);

create index if not exists idx_cars_brand_trgm
  on public.cars using gin (lower(brand) gin_trgm_ops);

create index if not exists idx_cars_model_trgm
  on public.cars using gin (lower(model) gin_trgm_ops);

create index if not exists idx_cars_engine_trgm
  on public.cars using gin (lower(coalesce(engine, '')) gin_trgm_ops);

create index if not exists idx_cars_description_trgm
  on public.cars using gin (lower(coalesce(description, '')) gin_trgm_ops);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.car_photos'::regclass
      and conname = 'car_photos_url_unique'
  ) then
    return;
  end if;

  if exists (
    select 1
    from public.car_photos
    group by url
    having count(*) > 1
  ) then
    raise notice 'Skipping car_photos_url_unique because duplicate URLs already exist.';
    return;
  end if;

  alter table public.car_photos
    add constraint car_photos_url_unique unique (url);
end $$;

create or replace function public.project_normalize_text(value text)
returns text
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select trim(
    regexp_replace(
      lower(extensions.unaccent(coalesce(value, ''))),
      '[^a-z0-9#]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.project_search_text(target public.cars)
returns text
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select public.project_normalize_text(
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
set search_path = public, extensions
as $$
  with normalized as (
    select
      public.project_normalize_text(p_query) as query,
      public.project_normalize_text(p_category) as category_filter,
      public.project_normalize_text(p_engine) as engine_filter,
      regexp_replace(public.project_normalize_text(p_tag), '^#+', '') as tag_filter,
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
        case when n.query <> '' and public.project_normalize_text(c.name) = n.query then 120 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.model) = n.query then 100 else 0 end +
        case when n.query <> '' and exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where regexp_replace(public.project_normalize_text(tag), '^#+', '') = regexp_replace(n.query, '^#+', '')
        ) then 100 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.name) like '%' || n.query || '%' then 40 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.model) like '%' || n.query || '%' then 36 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.brand) like '%' || n.query || '%' then 28 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.engine) like '%' || n.query || '%' then 26 else 0 end +
        case when n.query <> '' and exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where regexp_replace(public.project_normalize_text(tag), '^#+', '') like '%' || regexp_replace(n.query, '^#+', '') || '%'
        ) then 34 else 0 end +
        case when n.query <> '' and public.project_normalize_text(c.description) like '%' || n.query || '%' then 10 else 0 end +
        c.project_followers_count * 0.4 +
        c.likes_count * 0.3 +
        c.views_count * 0.02
      )::numeric as rank
    from public.cars c
    cross join normalized n
    where c.is_public = true
      and (n.category_filter = '' or public.project_normalize_text(c.category) = n.category_filter)
      and (n.engine_filter = '' or public.project_normalize_text(c.engine) like '%' || n.engine_filter || '%')
      and (
        n.tag_filter = ''
        or exists (
          select 1 from unnest(coalesce(c.tags, '{}'::text[])) tag
          where regexp_replace(public.project_normalize_text(tag), '^#+', '') like '%' || n.tag_filter || '%'
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
set search_path = public, extensions
as $$
  with normalized as (
    select public.project_normalize_text(p_query) as query, greatest(1, least(coalesce(p_limit, 8), 12)) as result_limit
  ),
  candidates as (
    select brand as term, 'Marca' as source, 80 as base_rank from public.cars where is_public
    union all select model, 'Modelo', 78 from public.cars where is_public
    union all select name, 'Projeto', 74 from public.cars where is_public
    union all select coalesce(engine, ''), 'Motor', 68 from public.cars where is_public and coalesce(engine, '') <> ''
    union all select category, 'Estilo', 72 from public.cars where is_public and coalesce(category, '') <> ''
    union all
    select regexp_replace(tag, '^#+', ''), 'Tag', 76
    from public.cars, unnest(coalesce(tags, '{}'::text[])) tag
    where is_public and tag <> ''
  ),
  filtered as (
    select
      initcap(trim(term)) as term,
      source,
      max(base_rank + case when public.project_normalize_text(term) like (select query from normalized) || '%' then 20 else 0 end) as rank
    from candidates, normalized
    where normalized.query <> ''
      and public.project_normalize_text(term) like '%' || normalized.query || '%'
    group by initcap(trim(term)), source
  )
  select term, source, rank
  from filtered
  where term <> ''
  order by rank desc, length(term), term
  limit (select result_limit from normalized);
$$;

alter table public.profiles
  add column if not exists instagram_handle text,
  add column if not exists is_likes_public boolean not null default false;

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  case
    when position('@' in display_name) > 1 then username::text
    else display_name
  end as display_name,
  avatar_url,
  bio,
  city,
  state,
  instagram_handle,
  is_saves_public,
  is_likes_public,
  cars_count,
  followers_count,
  following_count,
  created_at,
  updated_at
from public.profiles;

comment on view public.public_profiles is
  'Public-safe profile projection. Excludes email and full_name; use public.profiles only for the authenticated user own row.';

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.car_comments enable row level security;

drop policy if exists "car_comments_read_all" on public.car_comments;
drop policy if exists "car_comments_read_visible" on public.car_comments;
create policy "car_comments_read_visible" on public.car_comments
for select to anon, authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.cars c
    where c.id = car_comments.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_comments_insert_own" on public.car_comments;
create policy "car_comments_insert_own" on public.car_comments
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = car_comments.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_comments_delete_author" on public.car_comments;
create policy "car_comments_delete_author" on public.car_comments
for delete to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.cars c
    where c.id = car_comments.car_id
      and c.owner_id = auth.uid()
  )
);

alter table public.car_likes enable row level security;

drop policy if exists "car_likes_read_all" on public.car_likes;
drop policy if exists "car_likes_read_own_or_public_profile" on public.car_likes;
create policy "car_likes_read_own_or_public_profile" on public.car_likes
for select to anon, authenticated using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.profiles p
      where p.id = car_likes.user_id
        and p.is_likes_public = true
    )
    and exists (
      select 1
      from public.cars c
      where c.id = car_likes.car_id
        and c.is_public = true
    )
  )
);

drop policy if exists "car_likes_insert_own" on public.car_likes;
create policy "car_likes_insert_own" on public.car_likes
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = car_likes.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_likes_delete_own" on public.car_likes;
create policy "car_likes_delete_own" on public.car_likes
for delete to authenticated using (user_id = auth.uid());

alter table public.car_saves enable row level security;

drop policy if exists "car_saves_read_own_or_public_owner" on public.car_saves;
drop policy if exists "car_saves_read_own_or_public_profile" on public.car_saves;
create policy "car_saves_read_own_or_public_profile" on public.car_saves
for select to anon, authenticated using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.profiles p
      where p.id = car_saves.user_id
        and p.is_saves_public = true
    )
    and exists (
      select 1
      from public.cars c
      where c.id = car_saves.car_id
        and c.is_public = true
    )
  )
);

drop policy if exists "car_saves_insert_own" on public.car_saves;
create policy "car_saves_insert_own" on public.car_saves
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = car_saves.car_id
      and (c.is_public = true or c.owner_id = auth.uid())
  )
);

drop policy if exists "car_saves_delete_own" on public.car_saves;
create policy "car_saves_delete_own" on public.car_saves
for delete to authenticated using (user_id = auth.uid());

alter table public.user_follows enable row level security;

drop policy if exists "user_follows_read_all" on public.user_follows;
drop policy if exists "user_follows_read_related" on public.user_follows;
create policy "user_follows_read_related" on public.user_follows
for select to authenticated using (
  follower_id = auth.uid()
  or following_id = auth.uid()
);

drop policy if exists "user_follows_insert_own" on public.user_follows;
create policy "user_follows_insert_own" on public.user_follows
for insert to authenticated with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
);

drop policy if exists "user_follows_delete_own" on public.user_follows;
create policy "user_follows_delete_own" on public.user_follows
for delete to authenticated using (follower_id = auth.uid());

alter table public.project_follows enable row level security;

drop policy if exists "project_follows_read_all" on public.project_follows;
drop policy if exists "project_follows_read_own_or_project_owner" on public.project_follows;
create policy "project_follows_read_own_or_project_owner" on public.project_follows
for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.cars c
    where c.id = project_follows.car_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "project_follows_insert_own" on public.project_follows;
create policy "project_follows_insert_own" on public.project_follows
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.cars c
    where c.id = project_follows.car_id
      and c.is_public = true
      and c.owner_id <> auth.uid()
  )
);

drop policy if exists "project_follows_delete_own" on public.project_follows;
create policy "project_follows_delete_own" on public.project_follows
for delete to authenticated using (user_id = auth.uid());

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_system" on public.notifications;

create or replace function public.create_notification(
  p_recipient_id uuid,
  p_notification_type text,
  p_car_id uuid default null,
  p_notification_title text default null,
  p_notification_body text default null,
  p_dedupe boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_existing_id uuid;
  v_inserted_id uuid;
  v_should_dedupe boolean := coalesce(p_dedupe, true) or p_notification_type <> 'project_update';
begin
  if v_actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_recipient_id is null or p_recipient_id = v_actor_id then
    return null;
  end if;

  if p_notification_type not in (
    'follow',
    'project_comment',
    'project_like',
    'project_save',
    'project_follow',
    'project_update'
  ) then
    raise exception 'invalid_notification_type';
  end if;

  if coalesce(trim(p_notification_title), '') = '' then
    raise exception 'notification_title_required';
  end if;

  if p_notification_type = 'follow' then
    if p_car_id is not null or not exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = v_actor_id
        and uf.following_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_like' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_likes cl on cl.car_id = c.id and cl.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_save' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_saves cs on cs.car_id = c.id and cs.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_follow' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.project_follows pf on pf.car_id = c.id and pf.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_comment' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.car_comments cc on cc.car_id = c.id and cc.user_id = v_actor_id
      where c.id = p_car_id
        and c.owner_id = p_recipient_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  elsif p_notification_type = 'project_update' then
    if p_car_id is null or not exists (
      select 1
      from public.cars c
      join public.project_follows pf on pf.car_id = c.id and pf.user_id = p_recipient_id
      where c.id = p_car_id
        and c.owner_id = v_actor_id
    ) then
      raise exception 'invalid_notification_context';
    end if;
  end if;

  if v_should_dedupe then
    select n.id
    into v_existing_id
    from public.notifications as n
    where n.user_id = p_recipient_id
      and n.actor_id = v_actor_id
      and n.type = p_notification_type
      and n.car_id is not distinct from p_car_id
    order by n.created_at desc
    limit 1;

    if v_existing_id is not null then
      update public.notifications as n
      set
        title = p_notification_title,
        body = p_notification_body,
        href = null,
        url = null,
        read_at = null,
        created_at = now()
      where n.id = v_existing_id;

      return v_existing_id;
    end if;
  end if;

  insert into public.notifications (
    user_id,
    actor_id,
    car_id,
    type,
    title,
    body
  )
  values (
    p_recipient_id,
    v_actor_id,
    p_car_id,
    p_notification_type,
    p_notification_title,
    p_notification_body
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

grant usage on schema public to anon, authenticated;

revoke select on public.profiles from anon;
revoke select on public.profiles from authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

grant select on public.car_comments, public.car_likes, public.car_saves to anon, authenticated;
grant select on public.user_follows, public.project_follows to authenticated;
revoke select on public.user_follows, public.project_follows from anon;
grant insert, delete on public.car_comments, public.car_likes, public.car_saves, public.user_follows, public.project_follows to authenticated;

revoke insert on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant execute on function public.project_normalize_text(text) to anon, authenticated;
grant execute on function public.search_car_projects(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.suggest_car_project_terms(text, integer) to anon, authenticated;
grant execute on function public.increment_car_view(uuid) to anon, authenticated;
grant execute on function public.create_notification(uuid, text, uuid, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
