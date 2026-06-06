begin;

grant usage on schema public to anon, authenticated;

grant select on
  public.profiles,
  public.cars,
  public.car_photos,
  public.car_parts,
  public.car_likes,
  public.car_comments,
  public.user_follows,
  public.part_requirements,
  public.car_build_updates,
  public.car_expenses
to anon, authenticated;

grant select on public.car_saves to authenticated;

grant insert, update on public.profiles to authenticated;

grant insert, update, delete on
  public.cars,
  public.car_photos,
  public.car_parts,
  public.car_build_updates,
  public.car_expenses
to authenticated;

grant insert, delete on
  public.car_likes,
  public.car_saves,
  public.car_comments,
  public.user_follows
to authenticated;

commit;

notify pgrst, 'reload schema';
