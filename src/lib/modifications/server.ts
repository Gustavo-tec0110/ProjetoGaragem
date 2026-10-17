import "server-only";

import type {
  ModificationCatalogRow,
  ModificationCategoryRow,
  ProjectModificationRow,
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverLog } from "@/lib/server-log";
import { getCatalogAssetPath } from "@/lib/modifications/catalog-assets";
import type { ModificationPageData } from "@/lib/modifications/types";
import { protectedImageUrl } from "@/lib/images/project-image-url";

export async function getProjectModificationData(carId: string, isOwner: boolean): Promise<ModificationPageData> {
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
    isOwner
      ? supabase.from("project_modifications").select("*").eq("car_id", carId).order("created_at", { ascending: false })
      : supabase.rpc("list_public_project_modifications", { p_car_id: carId }),
  ]);

  if (modificationsResult.error) {
    serverLog.warn("project-modifications", { action: "read.failed", message: modificationsResult.error.message });
    throw new Error("Não foi possível carregar as modificações deste projeto.");
  }

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
  const rows = (modificationsResult.data ?? []) as ProjectModificationRow[];
  const modifications = rows.flatMap((item) => {
    const catalogItem = catalogById.get(item.catalog_id);
    const safeItem: ProjectModificationRow = isOwner ? item : {
      id: item.id,
      car_id: item.car_id,
      catalog_id: item.catalog_id,
      status: item.status,
      paid_amount: item.paid_amount,
      public_description: item.public_description,
      project_photo_url: item.project_photo_url,
      installed_at: item.installed_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      note: null,
      project_photo_storage_path: null,
      show_paid_amount: false,
    };
    return catalogItem ? [{ ...safeItem, project_photo_url: protectedImageUrl(safeItem.project_photo_url), catalog: catalogItem }] : [];
  });

  return { categories, catalog, modifications };
}
