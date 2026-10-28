import { CatalogHarnessReady } from "../../catalog/harness-ready";
import { notFound } from "next/navigation";
import { StressCases } from "./stress-cases";
import { catalogOfferDemoEnabled } from "@/lib/modifications/demo-offers";
import type { ModificationCatalogItem } from "@/lib/modifications/types";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default function CatalogDetailsStress() {
  if (!catalogOfferDemoEnabled()) notFound();
  const date = "2026-10-27T12:00:00Z";
  const base: ModificationCatalogItem = {
    id: "9a248f8c-dac9-4dc1-b9fc-ef824bb84850", category_id: "fixture", slug: "layout-fixture",
    name: "Fixture de layout: nome extenso para verificar legibilidade, quebra de linhas e acesso ao botão de fechar em diferentes tamanhos de tela",
    short_description: "Texto de teste para verificar a rolagem e a legibilidade de descrições extensas. ".repeat(12),
    default_image_path: null, estimated_price_min: null, estimated_price_max: null,
    compatibility_type: "adaptable", compatibility_notes: "Observação de teste. ".repeat(10), is_active: true, created_at: date, updated_at: date,
    category: { id: "fixture", parent_id: null, slug: "layout-fixture", name: "Fixture de layout", sort_order: 0, is_active: true, created_at: date, updated_at: date },
  };
  return <main className="mx-auto max-w-4xl space-y-5 px-5 pt-32">
    <h1 className="font-title text-2xl">Fixtures de layout · imagens históricas, sem substituir o catálogo</h1>
    <StressCases item={base} />
    <CatalogHarnessReady />
  </main>;
}
