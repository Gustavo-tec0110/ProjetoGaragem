begin;

create or replace function public.save_car_project_atomic(
  p_car_id uuid,
  p_car jsonb,
  p_photos jsonb,
  p_parts jsonb,
  p_updates jsonb,
  p_expenses jsonb
)
returns table (
  id uuid,
  slug text,
  name text,
  main_photo_url text,
  photo_urls text[]
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.cars%rowtype;
  v_car public.cars%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  if p_car is null or jsonb_typeof(p_car) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_car_payload';
  end if;

  if p_car_id is null then
    v_car := jsonb_populate_record(null::public.cars, p_car);
    v_car.id := gen_random_uuid();
    v_car.owner_id := v_user_id;
    v_car.photo_urls := coalesce(v_car.photo_urls, '{}'::text[]);
    v_car.tags := coalesce(v_car.tags, '{}'::text[]);
    v_car.version_confidence := coalesce(v_car.version_confidence, 'unknown');
    v_car.factory_spec_confidence := coalesce(v_car.factory_spec_confidence, 'estimated');
    v_car.spec_confidence_percent := coalesce(v_car.spec_confidence_percent, 20);
    v_car.original_engine_answer := coalesce(v_car.original_engine_answer, 'unknown');
    v_car.original_induction_answer := coalesce(v_car.original_induction_answer, 'unknown');
    v_car.original_color_answer := coalesce(v_car.original_color_answer, 'unknown');
    v_car.original_wheels_answer := coalesce(v_car.original_wheels_answer, 'unknown');
    v_car.original_interior_answer := coalesce(v_car.original_interior_answer, 'unknown');
    v_car.original_suspension_answer := coalesce(v_car.original_suspension_answer, 'unknown');
    v_car.show_expenses_public := coalesce(v_car.show_expenses_public, true);
    v_car.is_public := coalesce(v_car.is_public, true);
    v_car.likes_count := 0;
    v_car.saves_count := 0;
    v_car.comments_count := 0;
    v_car.views_count := 0;
    v_car.project_followers_count := 0;
    v_car.created_at := now();
    v_car.updated_at := now();

    insert into public.cars
    select v_car.*
    returning * into v_car;
  else
    select *
      into v_existing
      from public.cars
      where public.cars.id = p_car_id
      for update;

    if not found or v_existing.owner_id <> v_user_id then
      raise exception using errcode = '42501', message = 'project_not_owned';
    end if;

    v_car := jsonb_populate_record(v_existing, p_car);
    v_car.id := v_existing.id;
    v_car.owner_id := v_existing.owner_id;
    v_car.likes_count := v_existing.likes_count;
    v_car.saves_count := v_existing.saves_count;
    v_car.comments_count := v_existing.comments_count;
    v_car.views_count := v_existing.views_count;
    v_car.project_followers_count := v_existing.project_followers_count;
    v_car.created_at := v_existing.created_at;
    v_car.updated_at := now();

    update public.cars as c
    set
      slug = v_car.slug,
      name = v_car.name,
      brand = v_car.brand,
      model = v_car.model,
      year = v_car.year,
      version = v_car.version,
      catalog_version_id = v_car.catalog_version_id,
      version_confidence = v_car.version_confidence,
      factory_spec_confidence = v_car.factory_spec_confidence,
      factory_specs_note = v_car.factory_specs_note,
      factory_engine = v_car.factory_engine,
      factory_induction = v_car.factory_induction,
      factory_power_cv = v_car.factory_power_cv,
      factory_transmission = v_car.factory_transmission,
      factory_drivetrain = v_car.factory_drivetrain,
      spec_confidence_percent = v_car.spec_confidence_percent,
      original_engine_answer = v_car.original_engine_answer,
      original_induction_answer = v_car.original_induction_answer,
      current_induction = v_car.current_induction,
      original_color_answer = v_car.original_color_answer,
      original_wheels_answer = v_car.original_wheels_answer,
      original_interior_answer = v_car.original_interior_answer,
      original_suspension_answer = v_car.original_suspension_answer,
      category = v_car.category,
      state = v_car.state,
      city = v_car.city,
      description = v_car.description,
      main_photo_url = v_car.main_photo_url,
      photo_urls = coalesce(v_car.photo_urls, '{}'::text[]),
      engine = v_car.engine,
      power_cv = v_car.power_cv,
      fuel_type = v_car.fuel_type,
      transmission = v_car.transmission,
      drivetrain = v_car.drivetrain,
      suspension = v_car.suspension,
      wheels = v_car.wheels,
      tires = v_car.tires,
      brakes = v_car.brakes,
      project_status = v_car.project_status,
      progress_percent = v_car.progress_percent,
      mileage_km = v_car.mileage_km,
      torque_nm = v_car.torque_nm,
      weight_kg = v_car.weight_kg,
      started_at = v_car.started_at,
      project_goal = v_car.project_goal,
      tags = coalesce(v_car.tags, '{}'::text[]),
      show_expenses_public = v_car.show_expenses_public,
      is_public = v_car.is_public,
      updated_at = now()
    where c.id = p_car_id
    returning c.* into v_car;

    delete from public.car_photos where car_id = p_car_id;
    delete from public.car_parts where car_id = p_car_id;
    delete from public.car_build_updates where car_id = p_car_id;
    delete from public.car_expenses where car_id = p_car_id;
  end if;

  if jsonb_typeof(coalesce(p_photos, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_parts, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_updates, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_expenses, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid_related_payload';
  end if;

  insert into public.car_photos (car_id, url, alt, sort_order, storage_path, width, height)
  select
    v_car.id,
    photo.url,
    photo.alt,
    coalesce(photo.sort_order, 0),
    photo.storage_path,
    photo.width,
    photo.height
  from jsonb_to_recordset(coalesce(p_photos, '[]'::jsonb)) as photo(
    url text,
    alt text,
    sort_order integer,
    storage_path text,
    width integer,
    height integer
  );

  insert into public.car_parts (
    car_id, name, category, brand, description, status, priority, price_estimate,
    external_url, affiliate_url, store_name, product_id, installed_at, image_url, storage_path
  )
  select
    v_car.id, part.name, part.category, part.brand, part.description, part.status,
    part.priority, part.price_estimate, part.external_url, part.affiliate_url,
    part.store_name, part.product_id, part.installed_at, part.image_url, part.storage_path
  from jsonb_to_recordset(coalesce(p_parts, '[]'::jsonb)) as part(
    name text,
    category text,
    brand text,
    description text,
    status text,
    priority text,
    price_estimate integer,
    external_url text,
    affiliate_url text,
    store_name text,
    product_id text,
    installed_at date,
    image_url text,
    storage_path text
  );

  insert into public.car_build_updates (
    car_id, title, description, photo_url, photo_urls, category, happened_at, amount_spent
  )
  select
    v_car.id, update_row.title, update_row.description, update_row.photo_url,
    coalesce(update_row.photo_urls, '{}'::text[]), coalesce(update_row.category, 'outro'),
    update_row.happened_at, update_row.amount_spent
  from jsonb_to_recordset(coalesce(p_updates, '[]'::jsonb)) as update_row(
    title text,
    description text,
    photo_url text,
    photo_urls text[],
    category text,
    happened_at date,
    amount_spent integer
  );

  insert into public.car_expenses (
    car_id, name, category, amount, spent_at, note, part_name, is_public
  )
  select
    v_car.id, expense.name, expense.category, expense.amount, expense.spent_at,
    expense.note, expense.part_name, coalesce(expense.is_public, true)
  from jsonb_to_recordset(coalesce(p_expenses, '[]'::jsonb)) as expense(
    name text,
    category text,
    amount integer,
    spent_at date,
    note text,
    part_name text,
    is_public boolean
  );

  return query
  select v_car.id, v_car.slug, v_car.name, v_car.main_photo_url, v_car.photo_urls;
end;
$$;

revoke all on function public.save_car_project_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_car_project_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
