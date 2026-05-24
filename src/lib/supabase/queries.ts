import type { SupabaseClient } from "@supabase/supabase-js";

import type { DbBuild, DbCar, DbPart, DbProfile } from "@/lib/supabase/db-types";
import { asJsonStringArray, asTextArray } from "@/lib/supabase/db-parse";

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function qCarsLite(
  supabase: SupabaseClient
): Promise<QueryResult<Array<Pick<DbCar, "id" | "slug" | "name" | "brand" | "model" | "year_start" | "year_end" | "power_cv" | "torque_nm" | "weight_kg" | "category" | "fuel_type">>>> {
  const { data, error } = await supabase
    .from("cars")
    .select(
      "id, slug, name, brand, model, year_start, year_end, power_cv, torque_nm, weight_kg, category, fuel_type"
    )
    .order("brand", { ascending: true })
    .order("model", { ascending: true })
    .order("year_start", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Array<Pick<DbCar, "id" | "slug" | "name" | "brand" | "model" | "year_start" | "year_end" | "power_cv" | "torque_nm" | "weight_kg" | "category" | "fuel_type">>, error: null };
}

export async function qCarById(
  supabase: SupabaseClient,
  id: string
): Promise<QueryResult<DbCar>> {
  const { data, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "car_not_found" };

  const normalized: DbCar = {
    ...(data as DbCar),
    engine_options: (data as DbCar).engine_options,
    transmission_options: (data as DbCar).transmission_options,
    common_issues: asTextArray((data as DbCar).common_issues),
  };
  return { data: normalized, error: null };
}

export async function qCarBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<QueryResult<DbCar>> {
  const { data, error } = await supabase.from("cars").select("*").eq("slug", slug).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "car_not_found" };

  const normalized: DbCar = {
    ...(data as DbCar),
    engine_options: (data as DbCar).engine_options,
    transmission_options: (data as DbCar).transmission_options,
    common_issues: asTextArray((data as DbCar).common_issues),
  };
  return { data: normalized, error: null };
}

export async function qPartsLite(
  supabase: SupabaseClient
): Promise<
  QueryResult<
    Array<
      Pick<
        DbPart,
        | "id"
        | "slug"
        | "name"
        | "category"
        | "subcategory"
        | "brand"
        | "price_min"
        | "price_max"
        | "compatible_cars"
        | "affiliate_url"
        | "affiliate_store"
        | "image_url"
        | "notes"
      >
    >
  >
> {
  const { data, error } = await supabase
    .from("parts")
    .select(
      "id, slug, name, category, subcategory, brand, price_min, price_max, compatible_cars, affiliate_url, affiliate_store, image_url, notes"
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { data: null, error: error.message };

  const normalized = (data ?? []).map((row) => {
    const r = row as DbPart;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      category: r.category,
      subcategory: r.subcategory,
      brand: r.brand,
      price_min: r.price_min,
      price_max: r.price_max,
      compatible_cars: asTextArray(r.compatible_cars),
      affiliate_url: r.affiliate_url,
      affiliate_store: r.affiliate_store,
      image_url: r.image_url,
      notes: r.notes,
    };
  });

  return { data: normalized, error: null };
}

export async function qProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<QueryResult<DbProfile>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "profile_not_found" };

  const row = data as DbProfile;
  return {
    data: {
      ...row,
      garage_car_slugs: asTextArray(row.garage_car_slugs),
    },
    error: null,
  };
}

export async function qProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<QueryResult<DbProfile>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "profile_not_found" };

  const row = data as DbProfile;
  return {
    data: {
      ...row,
      garage_car_slugs: asTextArray(row.garage_car_slugs),
    },
    error: null,
  };
}

export function parseBuildPartIds(parts: unknown): string[] {
  return asJsonStringArray(parts);
}

export async function qPublicBuildBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<QueryResult<DbBuild>> {
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "build_not_found" };
  return { data: data as DbBuild, error: null };
}

