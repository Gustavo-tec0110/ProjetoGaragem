import { CatalogHarnessReady } from "../catalog/harness-ready";
import { notFound } from "next/navigation";
import { ProjectModifications } from "@/components/projects/project-modifications";
import definitions from "@/lib/modifications/catalog-definitions.json";
import { getApprovedCatalogAssetPath as getCatalogAssetPath } from "@/lib/modifications/approved-catalog-images";
import { catalogOfferDemoEnabled } from "@/lib/modifications/demo-offers";
import baseline from "../../../../docs/catalogo-2026-10-27/baseline.json";
import type { ModificationCatalogItem } from "@/lib/modifications/types";
import type { ModificationCategoryRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalhes do catálogo · avaliação local", robots: { index: false, follow: false } };

export default function CatalogDetailsPreview() {
  if (!catalogOfferDemoEnabled()) notFound();
  const categories = baseline.tables.modification_categories as ModificationCategoryRow[];
  const date = "2026-10-27T12:00:00Z";
  const catalog: ModificationCatalogItem[] = definitions.map((definition) => {
    const category = categories.find((row) => row.slug === definition.category)!;
    const old = baseline.tables.modification_catalog.find((row) => row.slug === definition.slug);
    return { id: old?.id ?? `local-${definition.slug}`, category_id: category.id, slug: definition.slug, name: definition.name,
      short_description: definition.description, default_image_path: getCatalogAssetPath(category.slug, definition.slug),
      estimated_price_min: null, estimated_price_max: null, compatibility_type: "adaptable", compatibility_notes: null,
      is_active: true, created_at: date, updated_at: date, category, search_terms: definition.aliases, selection_alias_of: definition.selectionAliasOf };
  });
  const samples = ["aerofolio", "turbo", "volante", "coilover", "radiador"].map((slug) => catalog.find((row) => row.slug === slug)!);
  return <div className="pt-24">
    <p className="mx-auto max-w-7xl px-4 text-xs text-muted">DEMONSTRAÇÃO LOCAL · Aerofólio, turbo e volante: três opções. Coilover: uma. Radiador: nenhuma.</p>
    <ProjectModifications carId="48db0602-a04d-47bf-8f8d-304d51210321" projectName="Catálogo · detalhes e lojas" projectHref="/" canEdit
      catalog={catalog} categories={categories} modifications={samples.map((item) => ({ id: `demo-${item.id}`, car_id: "48db0602-a04d-47bf-8f8d-304d51210321", catalog_id: item.id,
        status: "planned", paid_amount: null, note: null, public_description: null, show_paid_amount: false,
        project_photo_url: null, project_photo_storage_path: null, installed_at: null, created_at: date, updated_at: date, catalog: item }))} />
    <CatalogHarnessReady />
  </div>;
}
