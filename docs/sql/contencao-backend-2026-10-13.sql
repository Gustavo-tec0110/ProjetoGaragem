-- Restrictive rollback after a regression: stop public RPC access and cleanup.
-- Stop any external cleanup scheduler before running this SQL.
-- Keep owner RLS, private defaults, all data and additive columns intact.
-- This deliberately does not restore the old note/cost exposure.
begin;
do $containment$
begin
  if to_regprocedure('public.list_public_project_modifications(uuid)') is not null then
    revoke execute on function public.list_public_project_modifications(uuid) from anon, authenticated;
  end if;
  if to_regprocedure('public.list_public_car_build_updates(uuid[])') is not null then
    revoke execute on function public.list_public_car_build_updates(uuid[]) from anon, authenticated;
  end if;
  if to_regprocedure('public.list_public_car_expenses(uuid[])') is not null then
    revoke execute on function public.list_public_car_expenses(uuid[]) from anon, authenticated;
  end if;
  if to_regprocedure('public.claim_stale_pending_modification_photo(text)') is not null then
    revoke execute on function public.claim_stale_pending_modification_photo(text) from service_role;
  end if;
  if to_regprocedure('public.inspect_stale_pending_modification_photos(integer)') is not null then
    revoke execute on function public.inspect_stale_pending_modification_photos(integer) from service_role;
  end if;
  if to_regprocedure('public.prune_pending_modification_photo_leases()') is not null then
    revoke execute on function public.prune_pending_modification_photo_leases() from service_role;
  end if;
end;
$containment$;
commit;
