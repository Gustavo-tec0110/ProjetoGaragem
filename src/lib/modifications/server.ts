import "server-only";

import type {
  ModificationCatalogRow,
  ModificationCategoryRow,
  ProjectModificationRow,
} from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverLog } from "@/lib/server-log";
import definitions from "./catalog-definitions.json";
import { resolveApprovedCatalogImage as resolveCatalogImage } from "@/lib/modifications/approved-catalog-images";
import type { ModificationPageData } from "@/lib/modifications/types";
import { protectedImageUrl } from "@/lib/images/project-image-url";

const definitionBySlug = new Map(definitions.map((item) => [item.slug, item]));

export async function getProjectModificationData(carId: string, isOwner: boolean, overview = false): Promise<ModificationPageData> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { categories: [], catalog: [], modifications: [] };

  const modificationsResult = await (isOwner
    ? supabase.from("project_modifications").select("*").eq("car_id", carId).order("created_at", { ascending: false })
    : supabase.rpc("list_public_project_modifications", { p_car_id: carId }));
  if (modificationsResult.error) {
    serverLog.warn("project-modifications", { action: "read.failed", code: modificationsResult.error.code });
    throw new Error("Não foi possível carregar as modificações deste projeto.");
  }
  const linkedIds = [...new Set((modificationsResult.data ?? []).map((item) => item.catalog_id).filter((id): id is string => Boolean(id)))];
  // The project overview needs only linked components, never the entire picker catalog.
  if (overview && !linkedIds.length && !(modificationsResult.data ?? []).some((item) => !item.catalog_id)) return { categories: [], catalog: [], modifications: [] };
  let catalogQuery = supabase.from("modification_catalog").select("*").eq("is_active", true).order("name");
  if (overview && linkedIds.length) catalogQuery = catalogQuery.in("id", linkedIds);
  const [categoriesResult, catalogResult] = await Promise.all([
    supabase.from("modification_categories").select("*").eq("is_active", true).order("sort_order").order("name"),
    catalogQuery,
  ]);
  if (categoriesResult.error || catalogResult.error) {
    serverLog.warn("project-modifications", { action: "catalog.read.failed", code: categoriesResult.error?.code ?? catalogResult.error?.code });
    throw new Error("Não foi possível carregar o catálogo deste projeto.");
  }

  const categories = (categoriesResult.data ?? []) as ModificationCategoryRow[];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const catalog = ((catalogResult.data ?? []) as ModificationCatalogRow[]).flatMap((item) => {
    const category = categoryById.get(item.category_id);
    const definition = definitionBySlug.get(item.slug);
    return category ? [{
      ...item,
      // Only replace known shipped defaults; preserve independently curated database photos.
      default_image_path: resolveCatalogImage(category.slug, item.slug, item.default_image_path),
      search_terms: definition?.aliases,
      selection_alias_of: definition?.selectionAliasOf,
      category,
    }] : [];
  });
  const catalogById = new Map(catalog.map((item) => [item.id, item]));
  const rows = (modificationsResult.data ?? []) as ProjectModificationRow[];
  const modifications = rows.flatMap((item) => {
    const catalogItem = item.custom_name ? { id: "", name: item.custom_name, slug: "", category_id: "", short_description: null, default_image_path: null, estimated_price_min: null, estimated_price_max: null, compatibility_type: "universal" as const, compatibility_notes: null, is_active: true, created_at: item.created_at, updated_at: item.updated_at, category: { id: "", parent_id: null, slug: "personalizados", name: "Componente personalizado", sort_order: 0, is_active: true, created_at: item.created_at, updated_at: item.updated_at } } : catalogById.get(item.catalog_id!);
    const safeItem: ProjectModificationRow = isOwner ? item : {
      id: item.id,
      car_id: item.car_id,
      catalog_id: item.catalog_id,
      custom_name: item.custom_name,
      is_featured: item.is_featured,
      status: item.status,
      paid_amount: item.paid_amount,
      public_description: item.public_description,
      project_photo_url: item.project_photo_url,
      photo_gallery: item.photo_gallery,
      installed_at: item.installed_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      note: null,
      project_photo_storage_path: null,
      show_paid_amount: false,
    };
    return catalogItem ? [{ ...safeItem, project_photo_url: protectedImageUrl(safeItem.project_photo_url), catalog: catalogItem }] : [];
  });

  modifications.sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)));
  return { categories, catalog, modifications };
}
