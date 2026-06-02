import type { Metadata } from "next";

import { ProjectDiscoveryPage } from "@/components/projects/project-discovery-page";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
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

  return createSeoMetadata({
    title: q ? `Busca global: ${q}` : "Busca global",
    description:
      "Pesquise por projeto, dono, carro, motor e tags em uma busca unica da comunidade.",
    path: q ? `/buscar?${new URLSearchParams({ q }).toString()}` : "/buscar",
    canonicalPath: "/buscar",
  });
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = normalizeProjectFilters({
    q: param(params, "q"),
    style: param(params, "style"),
    engine: param(params, "engine"),
    sort: param(params, "sort") as
      | "recent"
      | "likes"
      | "views"
      | "updated"
      | "invested"
      | "hot",
  });
  const page = Number.parseInt(param(params, "page"), 10) || 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <ProjectDiscoveryPage
          basePath="/buscar"
          eyebrow="Busca global"
          title={
            filters.q
              ? `Resultados para "${filters.q}"`
              : "Pesquise por projeto, dono, motor ou tag"
          }
          description="A busca global cruza titulo, carro, dono, motor, tags e objetivo do projeto para acelerar a descoberta."
          filters={filters}
          page={page}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
