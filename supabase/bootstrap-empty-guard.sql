-- Bootstrap is permitted only before any application schema/users/objects exist.
do $$
begin
  if to_regclass('public.profiles') is not null
    or exists(select 1 from auth.users)
    or exists(select 1 from storage.objects) then
    raise exception 'Bootstrap requires a NEW empty database; use incremental migrations for existing databases';
  end if;
end;
$$;

-- Historical indexes use the unqualified pg_trgm operator class. Match the
-- Supabase extension search path while replaying the untouched migrations.
set search_path = public, extensions;
