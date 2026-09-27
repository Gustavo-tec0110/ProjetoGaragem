begin;

-- The function is SECURITY INVOKER: it runs as the authenticated caller, so
-- RLS remains the authorization boundary. A PostgreSQL function is atomic by
-- default; any validation or child-write error rolls back the whole mutation.
create or replace function public.save_car_project(
  p_car_id uuid,
  p_payload jsonb
)
returns table(id uuid, slug text, name text)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_car public.cars;
  v_car_json jsonb;
  v_existing public.cars;
begin
  if v_actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_payload -> 'car') <> 'object' then
    raise exception 'Invalid project payload.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload -> 'photos', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload -> 'parts', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload -> 'updates', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload -> 'expenses', '[]'::jsonb)) <> 'array' then
    raise exception 'Related project data must be arrays.' using errcode = '22023';
  end if;

  v_car_json := p_payload -> 'car';
  if nullif(trim(v_car_json ->> 'name'), '') is null
     or nullif(trim(v_car_json ->> 'brand'), '') is null
     or nullif(trim(v_car_json ->> 'model'), '') is null
     or nullif(trim(v_car_json ->> 'slug'), '') is null
     or coalesce((v_car_json ->> 'year')::integer, 0) not between 1900 and extract(year from now())::integer + 1 then
    raise exception 'Name, brand, model, slug and a valid year are required.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_payload -> 'parts') item
             where jsonb_typeof(item) <> 'object'
                or nullif(trim(item ->> 'name'), '') is null
                or coalesce(item ->> 'status', '') not in ('installed', 'planned', 'removed')
                or (item ? 'price_estimate' and jsonb_typeof(item -> 'price_estimate') <> 'null' and (item ->> 'price_estimate')::integer < 0)) then
    raise exception 'Invalid part payload.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_payload -> 'updates') item
             where jsonb_typeof(item) <> 'object'
                or char_length(trim(coalesce(item ->> 'title', ''))) not between 3 and 160
                or (item ? 'amount_spent' and jsonb_typeof(item -> 'amount_spent') <> 'null' and (item ->> 'amount_spent')::integer < 0)) then
    raise exception 'Invalid update payload.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_payload -> 'expenses') item
             where jsonb_typeof(item) <> 'object'
                or char_length(trim(coalesce(item ->> 'name', ''))) not between 2 and 160
                or jsonb_typeof(item -> 'amount') <> 'number' or (item ->> 'amount')::integer < 0) then
    raise exception 'Invalid expense payload.' using errcode = '22023';
  end if;

  if p_car_id is null then
    insert into public.cars (
      owner_id, slug, name, brand, model, year, version, catalog_version_id,
      version_confidence, factory_spec_confidence, factory_specs_note, factory_engine,
      factory_induction, factory_power_cv, factory_transmission, factory_drivetrain,
      spec_confidence_percent, original_engine_answer, original_induction_answer,
      current_induction, original_color_answer, original_wheels_answer,
      original_interior_answer, original_suspension_answer, category, state, city,
      description, main_photo_url, photo_urls, engine, power_cv, torque_nm, weight_kg,
      mileage_km, fuel_type, transmission, drivetrain, suspension, wheels, tires,
      brakes, project_status, progress_percent, started_at, project_goal, tags,
      show_expenses_public, is_public
    ) select
      v_actor, v_car_json ->> 'slug', v_car_json ->> 'name', v_car_json ->> 'brand',
      v_car_json ->> 'model', (v_car_json ->> 'year')::integer, v_car_json ->> 'version',
      nullif(v_car_json ->> 'catalog_version_id', '')::uuid, v_car_json ->> 'version_confidence',
      v_car_json ->> 'factory_spec_confidence', v_car_json ->> 'factory_specs_note',
      v_car_json ->> 'factory_engine', v_car_json ->> 'factory_induction',
      nullif(v_car_json ->> 'factory_power_cv', '')::integer, v_car_json ->> 'factory_transmission',
      v_car_json ->> 'factory_drivetrain', nullif(v_car_json ->> 'spec_confidence_percent', '')::integer,
      v_car_json ->> 'original_engine_answer', v_car_json ->> 'original_induction_answer',
      v_car_json ->> 'current_induction', v_car_json ->> 'original_color_answer',
      v_car_json ->> 'original_wheels_answer', v_car_json ->> 'original_interior_answer',
      v_car_json ->> 'original_suspension_answer', v_car_json ->> 'category', v_car_json ->> 'state',
      v_car_json ->> 'city', v_car_json ->> 'description', v_car_json ->> 'main_photo_url',
      coalesce(array(select jsonb_array_elements_text(v_car_json -> 'photo_urls')), '{}'::text[]),
      v_car_json ->> 'engine', nullif(v_car_json ->> 'power_cv', '')::integer,
      nullif(v_car_json ->> 'torque_nm', '')::integer, nullif(v_car_json ->> 'weight_kg', '')::integer,
      nullif(v_car_json ->> 'mileage_km', '')::integer, v_car_json ->> 'fuel_type',
      v_car_json ->> 'transmission', v_car_json ->> 'drivetrain', v_car_json ->> 'suspension',
      v_car_json ->> 'wheels', v_car_json ->> 'tires', v_car_json ->> 'brakes',
      v_car_json ->> 'project_status', nullif(v_car_json ->> 'progress_percent', '')::integer,
      nullif(v_car_json ->> 'started_at', '')::date, v_car_json ->> 'project_goal',
      coalesce(array(select jsonb_array_elements_text(v_car_json -> 'tags')), '{}'::text[]),
      coalesce((v_car_json ->> 'show_expenses_public')::boolean, true),
      coalesce((v_car_json ->> 'is_public')::boolean, true)
    returning * into v_car;
  else
    select * into v_existing from public.cars where cars.id = p_car_id for update;
    if not found or v_existing.owner_id <> v_actor then
      raise exception 'You can only edit your own projects.' using errcode = '42501';
    end if;
    update public.cars set
      slug = v_car_json ->> 'slug', name = v_car_json ->> 'name', brand = v_car_json ->> 'brand',
      model = v_car_json ->> 'model', year = (v_car_json ->> 'year')::integer,
      version = v_car_json ->> 'version', catalog_version_id = nullif(v_car_json ->> 'catalog_version_id', '')::uuid,
      version_confidence = v_car_json ->> 'version_confidence', factory_spec_confidence = v_car_json ->> 'factory_spec_confidence',
      factory_specs_note = v_car_json ->> 'factory_specs_note', factory_engine = v_car_json ->> 'factory_engine',
      factory_induction = v_car_json ->> 'factory_induction', factory_power_cv = nullif(v_car_json ->> 'factory_power_cv', '')::integer,
      factory_transmission = v_car_json ->> 'factory_transmission', factory_drivetrain = v_car_json ->> 'factory_drivetrain',
      spec_confidence_percent = nullif(v_car_json ->> 'spec_confidence_percent', '')::integer,
      original_engine_answer = v_car_json ->> 'original_engine_answer', original_induction_answer = v_car_json ->> 'original_induction_answer',
      current_induction = v_car_json ->> 'current_induction', original_color_answer = v_car_json ->> 'original_color_answer',
      original_wheels_answer = v_car_json ->> 'original_wheels_answer', original_interior_answer = v_car_json ->> 'original_interior_answer',
      original_suspension_answer = v_car_json ->> 'original_suspension_answer', category = v_car_json ->> 'category',
      state = v_car_json ->> 'state', city = v_car_json ->> 'city', description = v_car_json ->> 'description',
      main_photo_url = v_car_json ->> 'main_photo_url', photo_urls = coalesce(array(select jsonb_array_elements_text(v_car_json -> 'photo_urls')), '{}'::text[]),
      engine = v_car_json ->> 'engine', power_cv = nullif(v_car_json ->> 'power_cv', '')::integer,
      torque_nm = nullif(v_car_json ->> 'torque_nm', '')::integer, weight_kg = nullif(v_car_json ->> 'weight_kg', '')::integer,
      mileage_km = nullif(v_car_json ->> 'mileage_km', '')::integer, fuel_type = v_car_json ->> 'fuel_type',
      transmission = v_car_json ->> 'transmission', drivetrain = v_car_json ->> 'drivetrain', suspension = v_car_json ->> 'suspension',
      wheels = v_car_json ->> 'wheels', tires = v_car_json ->> 'tires', brakes = v_car_json ->> 'brakes',
      project_status = v_car_json ->> 'project_status', progress_percent = nullif(v_car_json ->> 'progress_percent', '')::integer,
      started_at = nullif(v_car_json ->> 'started_at', '')::date, project_goal = v_car_json ->> 'project_goal',
      tags = coalesce(array(select jsonb_array_elements_text(v_car_json -> 'tags')), '{}'::text[]),
      show_expenses_public = coalesce((v_car_json ->> 'show_expenses_public')::boolean, true),
      is_public = coalesce((v_car_json ->> 'is_public')::boolean, true), updated_at = now()
    where cars.id = p_car_id returning * into v_car;
  end if;

  delete from public.car_photos where car_id = v_car.id;
  insert into public.car_photos (car_id, url, alt, sort_order)
  select v_car.id, value, case when ordinal = 1 then 'Foto principal do carro' else 'Foto do projeto' end, ordinal - 1
  from jsonb_array_elements_text(p_payload -> 'photos') with ordinality as photo(value, ordinal)
  where nullif(trim(value), '') is not null;
  delete from public.car_parts where car_id = v_car.id;
  insert into public.car_parts (car_id, name, category, brand, description, status, priority, price_estimate, external_url, affiliate_url, store_name, product_id, installed_at, image_url)
  select v_car.id, item ->> 'name', coalesce(nullif(item ->> 'category', ''), 'Outros'), nullif(item ->> 'brand', ''), nullif(item ->> 'description', ''), item ->> 'status', nullif(item ->> 'priority', ''), nullif(item ->> 'price_estimate', '')::integer, nullif(item ->> 'external_url', ''), nullif(item ->> 'affiliate_url', ''), nullif(item ->> 'store_name', ''), nullif(item ->> 'product_id', ''), nullif(item ->> 'installed_at', '')::date, nullif(item ->> 'image_url', '') from jsonb_array_elements(p_payload -> 'parts') item;
  delete from public.car_build_updates where car_id = v_car.id;
  insert into public.car_build_updates (car_id, title, description, photo_url, photo_urls, category, happened_at, amount_spent)
  select v_car.id, item ->> 'title', nullif(item ->> 'description', ''), nullif(item ->> 'photo_url', ''), coalesce(array(select jsonb_array_elements_text(item -> 'photo_urls')), '{}'::text[]), coalesce(nullif(item ->> 'category', ''), 'outro'), (item ->> 'happened_at')::date, nullif(item ->> 'amount_spent', '')::integer from jsonb_array_elements(p_payload -> 'updates') item;
  delete from public.car_expenses where car_id = v_car.id;
  insert into public.car_expenses (car_id, name, category, amount, spent_at, note, part_name, is_public)
  select v_car.id, item ->> 'name', coalesce(nullif(item ->> 'category', ''), 'Outros'), (item ->> 'amount')::integer, (item ->> 'spent_at')::date, nullif(item ->> 'note', ''), nullif(item ->> 'part_name', ''), coalesce((item ->> 'is_public')::boolean, true) from jsonb_array_elements(p_payload -> 'expenses') item;
  return query select v_car.id, v_car.slug, v_car.name;
end;
$$;

revoke all on function public.save_car_project(uuid, jsonb) from public, anon;
grant execute on function public.save_car_project(uuid, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
