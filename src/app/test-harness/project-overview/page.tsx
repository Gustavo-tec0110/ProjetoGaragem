import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";
import { CatalogHarnessReady } from "../catalog/harness-ready";
import { enrichProject } from "@/lib/projects/utils";
import { withCatalogModifications } from "@/lib/modifications/project-overview";
import definitions from "@/lib/modifications/catalog-definitions.json";
import { getApprovedCatalogAssetPath } from "@/lib/modifications/approved-catalog-images";
import baseline from "../../../../docs/catalogo-2026-10-27/baseline.json";
import type { ModificationCatalogItem, ProjectModification } from "@/lib/modifications/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha Garagem · revisão local", robots: { index: false, follow: false } };

export default async function ProjectOverviewPreview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV !== "development" || process.env.MODIFICATION_PHOTOS_TEST_HARNESS !== "1") notFound();
  const options = await searchParams;
  const date = "2026-10-27T12:00:00Z";
  const project = enrichProject({
    id: "local-overview", slug: "revisao-local", source: "local", databaseId: null, ownerId: null,
    title: "Opala de garagem", ownerName: "Garagem de revisão", ownerUsername: "revisao-local",
    carModel: "Chevrolet Opala", brand: "Chevrolet", model: "Opala", year: 1978, engine: "4.1 seis cilindros",
    style: "Clássicos", shortDescription: "Clássico em evolução", description: "Configuração e próximos passos do projeto. Dados de demonstração local para avaliar a organização da ficha.",
    mainImage: "/ref/hero-opala-ss.webp", gallery: ["/ref/hero-opala-ss.webp"],
    installedParts: [], plannedParts: [], estimatedCost: null, likes: 0, saves: 0, views: 0, comments: 0,
    tags: ["Clássicos"], city: "Salvador", state: "BA", createdAt: date, updatedAt: date,
    isPublic: true, viewerHasLiked: false, viewerHasSaved: false, editHref: "/projeto/revisao-local/editar",
    projectGoal: "Preservar o clássico com melhorias de dirigibilidade", powerCv: 140, fuelType: "Gasolina",
    currentInduction: "Aspirado", drivetrain: "Traseira", factoryEngine: "4.1 seis cilindros",
  });
  const modifications: ProjectModification[] = options.empty === "1" ? [] : ["volante", "radiador", "coilover"].map((slug, index) => {
    const item = definitions.find((row) => row.slug === slug)!;
    const category = baseline.tables.modification_categories.find((row) => row.slug === item.category)!;
    const old = baseline.tables.modification_catalog.find((row) => row.slug === slug);
    const catalog: ModificationCatalogItem = {
      id: old?.id ?? `local-${slug}`, category_id: category.id, slug, name: item.name,
      short_description: item.description, default_image_path: getApprovedCatalogAssetPath(category.slug, slug),
      estimated_price_min: null, estimated_price_max: null, compatibility_type: "adaptable", compatibility_notes: null,
      is_active: true, created_at: date, updated_at: date, category,
    };
    return { id: `local-mod-${slug}`, car_id: project.id, catalog_id: catalog.id, catalog,
      status: index === 2 ? "wishlist" : "installed", paid_amount: null, note: null, show_paid_amount: false,
      public_description: index === 0 ? "Volante de época com aplicação conferida na instalação." : null,
      project_photo_url: null, project_photo_storage_path: null, installed_at: index === 2 ? null : "2026-10-27",
      created_at: date, updated_at: date,
    };
  });
  return <main className="pt-20">
    <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-muted">REVISÃO LOCAL · Dados de demonstração; nenhuma oferta comercial cadastrada.</p>
    <ProjectDetail project={withCatalogModifications(project, modifications)} similarProjects={[]} viewerLoggedIn={false}
      canEdit={options.owner === "1"} modificationsUnavailable={options.unavailable === "1"}
      technicalSpecs={[{ label: "Combustível", value: "Gasolina" }, { label: "Câmbio", value: "Manual de 4 marchas" }]} />
    <CatalogHarnessReady />
  </main>;
}
