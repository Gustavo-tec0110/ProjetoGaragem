import "server-only";

import type {
  ModificationCatalogRow,
  ModificationCategoryRow,
  ProjectModificationRow,
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCatalogAssetPath } from "@/lib/modifications/catalog-assets";
import type { ModificationPageData } from "@/lib/modifications/types";

export async function getProjectModificationData(carId: string): Promise<ModificationPageData> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { categories: [], catalog: [], modifications: [] };

  const [categoriesResult, catalogResult, modificationsResult] = await Promise.all([
    supabase
      .from("modification_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("modification_catalog")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("project_modifications")
      .select("*")
      .eq("car_id", carId)
      .order("created_at", { ascending: false }),
  ]);

  const categories = (categoriesResult.data ?? []) as ModificationCategoryRow[];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const catalog = ((catalogResult.data ?? []) as ModificationCatalogRow[]).flatMap((item) => {
    const category = categoryById.get(item.category_id);
    return category ? [{
      ...item,
      // A populated database value always wins. This keeps the shipped asset
      // mapping safe while the remote catalog is progressively backfilled.
      default_image_path: item.default_image_path ?? getCatalogAssetPath(category.slug, item.slug),
      category,
    }] : [];
  });
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const modifications = ((modificationsResult.data ?? []) as ProjectModificationRow[]).flatMap((item) => {
    const catalogItem = catalogById.get(item.catalog_id);
    return catalogItem ? [{ ...item, catalog: catalogItem }] : [];
  });

  return { categories, catalog, modifications };
}
