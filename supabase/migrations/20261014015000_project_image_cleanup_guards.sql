-- Requires image registry preparation; preserves lease durations and retention.
begin;

create or replace function public.touch_pending_modification_photo(p_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or p_path !~ ('^' || v_user::text || '/pending-modifications/[0-9a-f-]{36}\.webp$') then
    return false;
  end if;
  -- Serialize touch/claim even when no lease row exists yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_path, 0));
  if exists (select 1 from public.project_image_deletion_claims where path = p_path) then return false; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'project-images' and name = p_path) then
    return false;
  end if;
  insert into public.pending_modification_photo_leases(path, user_id, lease_until)
  values (p_path, v_user, now() + interval '30 minutes')
  on conflict (path) do update set lease_until = excluded.lease_until
    where public.pending_modification_photo_leases.user_id = v_user
      and public.pending_modification_photo_leases.claimed_at is null;
  return found;
end;
$$;
revoke all on function public.touch_pending_modification_photo(text) from public;
grant execute on function public.touch_pending_modification_photo(text) to authenticated;

-- Bounded inspection avoids listing the entire Storage bucket on every run.
create or replace function public.inspect_stale_pending_modification_photos(p_limit integer default 100)
returns table(path text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.path, o.created_at
  from public.pending_modification_photo_leases l
  join storage.objects o on o.bucket_id = 'project-images' and o.name = l.path
  where l.lease_until <= now() and o.created_at <= now() - interval '7 days'
    and (l.claimed_at is null or l.claimed_at <= now() - interval '1 hour')
    and not exists (select 1 from public.project_image_references r where r.path = l.path)
  order by l.lease_until, l.path
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
revoke all on function public.inspect_stale_pending_modification_photos(integer) from public, anon, authenticated;
grant execute on function public.inspect_stale_pending_modification_photos(integer) to service_role;

-- Only the worker's service role can claim an object. The claim and reference
-- check happen in one transaction. A late editor cannot renew a claimed path.
create or replace function public.claim_stale_pending_modification_photo(p_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_created timestamptz;
  v_lease public.pending_modification_photo_leases%rowtype;
begin
  if p_path !~ '^[0-9a-f-]{36}/pending-modifications/[0-9a-f-]{36}\.webp$' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_path, 0));
  v_user := split_part(p_path, '/', 1)::uuid;
  select created_at into v_created from storage.objects
    where bucket_id = 'project-images' and name = p_path;
  if v_created is null or v_created > now() - interval '7 days' then return false; end if;

  select * into v_lease from public.pending_modification_photo_leases
    where path = p_path for update;
  -- Legacy/untracked files never become disposable merely because they are old.
  if not found or v_lease.user_id <> v_user then return false; end if;
  if v_lease.lease_until > now() or
    (v_lease.claimed_at is not null and v_lease.claimed_at > now() - interval '1 hour') then
    return false;
  end if;
  if exists (select 1 from public.project_image_references where path = p_path) then return false; end if;
  insert into public.project_image_deletion_claims(path) values (p_path) on conflict do nothing;

  update public.pending_modification_photo_leases set claimed_at = now() where path = p_path;
  return true;
end;
$$;
revoke all on function public.claim_stale_pending_modification_photo(text) from public, anon, authenticated;
grant execute on function public.claim_stale_pending_modification_photo(text) to service_role;

create or replace function public.prune_pending_modification_photo_leases()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from public.pending_modification_photo_leases l
  where l.path in (
    select old.path from public.pending_modification_photo_leases old
    where old.lease_until < now() and old.created_at < now() - interval '7 days'
      and not exists (select 1 from storage.objects o
        where o.bucket_id = 'project-images' and o.name = old.path)
    order by old.created_at limit 500
  );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.prune_pending_modification_photo_leases() from public, anon, authenticated;
grant execute on function public.prune_pending_modification_photo_leases() to service_role;

commit;
