import { CatalogHarnessReady } from "./harness-ready";
import { notFound } from "next/navigation";
import { ProjectModifications } from "@/components/projects/project-modifications";
import definitions from "@/lib/modifications/catalog-definitions.json";
import { getApprovedCatalogAssetPath as getCatalogAssetPath } from "@/lib/modifications/approved-catalog-images";
import baseline from "../../../../docs/catalogo-2026-10-27/baseline.json";
import type { ModificationCatalogItem } from "@/lib/modifications/types";
import type { ModificationCategoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function CatalogTestPage() {
  if (process.env.MODIFICATION_PHOTOS_TEST_HARNESS !== "1") notFound();
  const categories = baseline.tables.modification_categories as ModificationCategoryRow[];
  const date = "2026-10-27T12:00:00Z";
  const catalog: ModificationCatalogItem[] = definitions.map<ModificationCatalogItem>((item) => {
    const category = categories.find((category) => category.slug === item.category)!;
    const old = baseline.tables.modification_catalog.find((row) => row.slug === item.slug);
    return {
      id: old?.id ?? `local-${item.slug}`, category_id: category.id, slug: item.slug, name: item.name,
      short_description: item.description, default_image_path: getCatalogAssetPath(category.slug, item.slug),
      estimated_price_min: null, estimated_price_max: null, compatibility_type: "adaptable",
      compatibility_notes: null, is_active: true, created_at: date, updated_at: date,
      search_terms: item.aliases, selection_alias_of: item.selectionAliasOf, category,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const legacy = catalog.find((item) => item.slug === "suspensao-rosca")!;
  return <div className="pt-24"><ProjectModifications
    carId="48db0602-a04d-47bf-8f8d-304d51210321" projectName="Catálogo · revisão local" projectHref="/" canEdit
    categories={categories.sort((a, b) => a.sort_order - b.sort_order)} catalog={catalog}
    modifications={[{id:"local-legacy", car_id:"48db0602-a04d-47bf-8f8d-304d51210321",catalog_id:legacy.id,
      status:"installed", paid_amount:null, note:null, public_description:"Registro antigo preservado para verificar edição e referências.",
      show_paid_amount:false, project_photo_url:null, project_photo_storage_path:null, installed_at:null,
      created_at:date, updated_at:date, catalog:legacy}]}
  /><CatalogHarnessReady /></div>;
}
