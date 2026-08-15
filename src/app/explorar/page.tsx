import type { Metadata } from "next";

import { ProjectDiscoveryPage } from "@/components/projects/project-discovery-page";
import { createSeoMetadata } from "@/lib/seo";
import { normalizeProjectFilters } from "@/lib/projects/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = param(params, "q");
  const style = param(params, "style");
  const sort = param(params, "sort");
  const category = param(params, "category");

  return createSeoMetadata({
    title: q ? `Explorar projetos: ${q}` : style || category ? `Explorar projetos ${style || category}` : "Explorar projetos",
    description:
      q || style || category
        ? "Busque projetos por nome, marca, modelo, tags e estilos como JDM, off-road, turbo, stance e sleeper."
        : sort === "popular" || sort === "hot"
          ? "Descubra os projetos em alta, mais curtidos, mais vistos e recentemente atualizados."
          : "Explore projetos automotivos, descubra builds em destaque e acompanhe evolucoes reais.",
    path: `/explorar${q || style || sort ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(style ? { style } : {}), ...(sort ? { sort } : {}) }).toString()}` : ""}`,
    canonicalPath: "/explorar",
  });
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = normalizeProjectFilters({
    q: param(params, "q"),
    brand: param(params, "brand"),
    model: param(params, "model"),
    year: param(params, "year"),
    fuel: param(params, "fuel"),
    induction: param(params, "induction"),
    drivetrain: param(params, "drivetrain"),
    category: param(params, "category"),
    style: param(params, "style"),
    engine: param(params, "engine"),
    tag: param(params, "tag"),
    sort: param(params, "sort") as
      | "relevance"
      | "recent"
      | "popular"
      | "likes"
      | "comments"
      | "views"
      | "updated"
      | "invested"
      | "hot",
  });
  const page = Number.parseInt(param(params, "page"), 10) || 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 px-4 sm:px-6">
        <ProjectDiscoveryPage
          basePath="/explorar"
          eyebrow="Catalogo social"
          title="Explorar projetos"
          description="Descubra builds reais da comunidade, pesquise por nome, marca, modelo, tags e estilos como JDM, off-road, turbo, stance, sleeper e track day."
          filters={filters}
          page={page}
        />
      </main>
    </div>
  );
}
