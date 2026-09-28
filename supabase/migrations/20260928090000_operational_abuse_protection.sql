-- Proteções de custo e abuso: limites persistidos por usuário e quota no Storage.
-- Esta migration é idempotente e não requer service-role no frontend.

begin;

create table if not exists public.action_rate_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  primary key (actor_id, action)
);

alter table public.action_rate_limits enable row level security;
revoke all on public.action_rate_limits from anon, authenticated;

create or replace function public.enforce_action_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_max_attempts integer;
  v_window_seconds integer;
  v_window_started timestamptz;
  v_attempts integer;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  case p_action
    when 'project_create' then v_max_attempts := 4; v_window_seconds := 3600;
    when 'project_update' then v_max_attempts := 24; v_window_seconds := 3600;
    when 'profile_write' then v_max_attempts := 12; v_window_seconds := 3600;
    when 'upload_image' then v_max_attempts := 16; v_window_seconds := 600;
    when 'comment_create' then v_max_attempts := 8; v_window_seconds := 600;
    when 'comment_delete' then v_max_attempts := 20; v_window_seconds := 600;
    when 'social_toggle' then v_max_attempts := 45; v_window_seconds := 600;
    when 'notification_read' then v_max_attempts := 60; v_window_seconds := 60;
    else raise exception using errcode = '22023', message = 'invalid_rate_limit_action';
  end case;

  v_window_started := to_timestamp(floor(extract(epoch from clock_timestamp()) / v_window_seconds) * v_window_seconds);

  insert into public.action_rate_limits (actor_id, action, window_started, attempts)
  values (v_actor_id, p_action, v_window_started, 1)
  on conflict (actor_id, action) do update
    set window_started = excluded.window_started,
        attempts = case
          when public.action_rate_limits.window_started < excluded.window_started then 1
          else public.action_rate_limits.attempts + 1
        end
    where public.action_rate_limits.window_started < excluded.window_started
       or public.action_rate_limits.attempts < v_max_attempts
  returning attempts into v_attempts;

  return found and v_attempts <= v_max_attempts;
end;
$$;

revoke all on function public.enforce_action_rate_limit(text) from public;
grant execute on function public.enforce_action_rate_limit(text) to authenticated;

-- Serializa criações da mesma conta pelo registro de perfil antes de contar.
-- Assim, duas requests concorrentes não ultrapassam a quota de projetos.
create or replace function public.project_creation_within_quota()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then return false; end if;
  perform 1 from public.profiles where id = v_actor_id for update;
  if not found then return false; end if;
  return (select count(*) from public.cars where owner_id = v_actor_id) < 25;
end;
$$;

revoke all on function public.project_creation_within_quota() from public;
grant execute on function public.project_creation_within_quota() to authenticated;

drop policy if exists "cars_insert_own" on public.cars;
create policy "cars_insert_own" on public.cars
for insert to authenticated
with check (owner_id = auth.uid() and public.project_creation_within_quota());

-- Serializa uploads da mesma conta. A contagem abaixo fica limitada a no máximo
-- 150 objetos por usuário e não deixa duas inserções concorrentes furarem a quota.
create table if not exists public.storage_quota_locks (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.storage_quota_locks enable row level security;
revoke all on public.storage_quota_locks from anon, authenticated;

-- A tabela storage.objects é a fonte confiável do tamanho: a Storage API preenche
-- metadata.size; dados enviados pelo browser não são usados para calcular a quota.
create or replace function public.storage_upload_within_quota(p_new_bytes bigint)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_count bigint;
  v_bytes bigint;
begin
  if v_actor_id is null or p_new_bytes not between 1 and 5242880 then return false; end if;
  insert into public.storage_quota_locks (user_id) values (v_actor_id) on conflict do nothing;
  perform 1 from public.storage_quota_locks where user_id = v_actor_id for update;
  select count(*), coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
    into v_count, v_bytes
    from storage.objects o
   where o.bucket_id = 'project-images'
     and split_part(o.name, '/', 1) = v_actor_id::text;
  return v_count < 150 and v_bytes + p_new_bytes <= 524288000;
end;
$$;

revoke all on function public.storage_upload_within_quota(bigint) from public;
grant execute on function public.storage_upload_within_quota(bigint) to authenticated;

drop policy if exists "project_images_insert_own_folder" on storage.objects;
create policy "project_images_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and public.storage_upload_within_quota(coalesce((metadata ->> 'size')::bigint, 0))
);

-- O bucket continua a ser a barreira de tamanho/MIME no Storage; a aplicação
-- reencoda toda imagem enviada pela UI antes de persistir.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'project-images';

commit;
