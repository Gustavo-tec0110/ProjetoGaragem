begin;
-- The active MVP reads car_parts/car_expenses/modification_catalog instead.
-- No new public access is granted. Keep historical data and service access.
do $$
declare t text; p record; cols text;
begin
  foreach t in array array['parts_catalog','part_vehicle_compatibility','part_dependencies',
    'project_parts','build_budgets','part_alert_rules','part_recommendation_rules'] loop
    -- Some hosted installations never created these retired tables.
    if to_regclass(format('public.%I',t)) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    select string_agg(quote_ident(attname), ', ') into cols from pg_attribute
      where attrelid = format('public.%I',t)::regclass and attnum > 0 and not attisdropped;
    execute format('revoke select (%s), insert (%s), update (%s), references (%s) on public.%I from public, anon, authenticated', cols, cols, cols, cols, t);
    -- Remove old permissive policies as defense against accidental future grants.
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname,t);
    end loop;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
