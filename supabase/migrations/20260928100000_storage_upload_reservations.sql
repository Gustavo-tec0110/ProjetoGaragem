begin;

create table if not exists public.storage_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bytes bigint not null check (bytes > 0 and bytes <= 5242880),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists storage_upload_reservations_active_user_idx
  on public.storage_upload_reservations (user_id, expires_at);

alter table public.storage_upload_reservations enable row level security;
revoke all on table public.storage_upload_reservations from anon, authenticated;

create or replace function public.reserve_storage_upload(p_new_bytes bigint)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_files bigint;
  v_bytes bigint;
  v_reservation_id uuid;
begin
  if v_actor_id is null or p_new_bytes is null or p_new_bytes < 1 or p_new_bytes > 5242880 then
    return null;
  end if;

  insert into public.storage_quota_locks (user_id)
  values (v_actor_id)
  on conflict (user_id) do nothing;

  perform 1
  from public.storage_quota_locks
  where user_id = v_actor_id
  for update;

  delete from public.storage_upload_reservations
  where expires_at <= now();

  select count(*), coalesce(sum(bytes), 0)
  into v_files, v_bytes
  from (
    select coalesce((o.metadata ->> 'size')::bigint, 0) as bytes
    from storage.objects as o
    where o.bucket_id = 'project-images'
      and split_part(o.name, '/', 1) = v_actor_id::text

    union all

    select r.bytes
    from public.storage_upload_reservations as r
    where r.user_id = v_actor_id
      and r.expires_at > now()
  ) as usage;

  if v_files >= 150 or v_bytes + p_new_bytes > 524288000 then
    return null;
  end if;

  insert into public.storage_upload_reservations (user_id, bytes, expires_at)
  values (v_actor_id, p_new_bytes, now() + interval '5 minutes')
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

revoke all on function public.reserve_storage_upload(bigint) from public;
grant execute on function public.reserve_storage_upload(bigint) to authenticated;

create or replace function public.release_storage_upload_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.storage_upload_reservations
  where id = p_reservation_id;
end;
$$;

revoke all on function public.release_storage_upload_reservation(uuid) from public, anon, authenticated;
grant execute on function public.release_storage_upload_reservation(uuid) to service_role;

commit;
