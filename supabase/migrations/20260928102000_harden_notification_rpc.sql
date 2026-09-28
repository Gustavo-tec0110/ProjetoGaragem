begin;

alter function public.create_notification(uuid, text, uuid, text, text, boolean)
  set search_path to pg_catalog, public;

revoke all on function public.create_notification(uuid, text, uuid, text, text, boolean) from public;
grant execute on function public.create_notification(uuid, text, uuid, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
