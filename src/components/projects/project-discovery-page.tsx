import Link from "next/link";

import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectGrid } from "@/components/projects/project-grid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProjectCollection } from "@/lib/projects/server";
import type { Project, ProjectFilters as ProjectFiltersType } from "@/lib/projects/types";
import { paginateProjects, sortProjects } from "@/lib/projects/utils";

function buildHref(basePath: string, filters: ProjectFiltersType, page?: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.model) params.set("model", filters.model);
  if (filters.year) params.set("year", filters.year);
  if (filters.fuel) params.set("fuel", filters.fuel);
  if (filters.induction) params.set("induction", filters.induction);
  if (filters.drivetrain) params.set("drivetrain", filters.drivetrain);
  if (filters.category) params.set("category", filters.category);
  if (filters.style) params.set("style", filters.style);
  if (filters.engine) params.set("engine", filters.engine);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.sort) params.set("sort", filters.sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

const QUICK_SEARCHES = ["JDM", "off-road", "Gol", "Turbo", "Stance", "Track day"] as const;

function DiscoverySection({
  title,
  projects,
  moreHref,
}: {
  title: string;
  projects: Project[];
  moreHref: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">Descoberta</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">{title}</h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={moreHref}>Ver lista</Link>
        </Button>
      </div>
      <ProjectGrid
        projects={projects}
        emptyTitle="Sem projetos suficientes nesta categoria por enquanto."
      />
    </section>
  );
}

export async function ProjectDiscoveryPage({
  basePath,
  eyebrow,
  title,
  description,
  filters,
  page,
}: {
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
  filters: ProjectFiltersType;
  page: number;
}) {
  const result = await getProjectCollection(filters, false);
  const hasFilters = Boolean(
    filters.q ||
      filters.brand ||
      filters.model ||
      filters.year ||
      filters.fuel ||
      filters.induction ||
      filters.drivetrain ||
      filters.category ||
      filters.style ||
      filters.engine ||
      filters.tag
  );
  const pageData = paginateProjects(result.projects, page);
  const emptyTitle = hasFilters
    ? "Nenhum projeto encontrado para essa busca."
    : "Ainda nao ha projetos para exibir.";

  return (
    <div className="mobile-page-shell mx-auto w-full max-w-6xl pb-8 md:pb-12 md:pt-24">
      <div className="flex flex-col gap-4 border-b border-border/55 pb-6 md:flex-row md:items-end md:justify-between md:gap-8 md:pb-8">
        <div>
          <p className="pg-eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-title text-3xl leading-tight tracking-tight sm:text-4xl md:text-5xl">{title}</h1>
          <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-5 text-muted md:mt-3 md:line-clamp-none md:text-base">{description}</p>
        </div>
        <Button asChild size="sm" className="self-start md:h-10">
          <Link href="/criar-projeto">Adicionar meu projeto</Link>
        </Button>
      </div>

      <div className="mt-5 md:mt-8">
        <ProjectFilters
          filters={filters}
          availableStyles={result.availableStyles}
          availableEngines={result.availableEngines}
          availableBrands={result.availableBrands}
          availableModels={result.availableModels}
          availableYears={result.availableYears}
          availableFuels={result.availableFuels}
          availableInductions={result.availableInductions}
          availableDrivetrains={result.availableDrivetrains}
          availableCategories={result.availableCategories}
          actionPath={basePath}
        />
      </div>

      {hasFilters ? (
        <Card className="mt-6 hidden border-border/70 bg-background/30 p-5 md:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs text-muted">Busca ativa</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">
                {pageData.totalItems
                  ? `${pageData.totalItems.toLocaleString("pt-BR")} projetos encontrados`
                  : "Nenhum projeto bateu com os filtros"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                A busca cruza apelido, marca, modelo, ano, motor, descricao e tags.
                Os filtros podem ser combinados para refinar a descoberta.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={basePath}>Limpar filtros</Link>
              </Button>
              {QUICK_SEARCHES.slice(0, 3).map((query) => (
                <Button key={query} asChild variant="ghost" size="sm">
                  <Link
                    href={buildHref(basePath, {
                      q: query,
                      brand: "",
                      model: "",
                      year: "",
                      fuel: "",
                      induction: "",
                      drivetrain: "",
                      category: "",
                      style: "",
                      engine: "",
                      tag: "",
                      sort: "relevance",
                    })}
                  >
                    {query}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {result.notice ? (
        <div className="mt-6 rounded-4xl border border-warning/30 bg-warning/10 p-5 text-sm text-muted">
          {result.notice}
        </div>
      ) : null}

      <div className="flex flex-col">
      {!hasFilters ? (
        <div className="order-2 mt-12 grid gap-12">
          <DiscoverySection
            title="Projetos em alta"
            projects={sortProjects(result.allProjects, "popular").slice(0, 3)}
            moreHref={buildHref(basePath, { ...filters, sort: "popular" })}
          />
          <DiscoverySection
            title="Mais curtidos"
            projects={sortProjects(result.allProjects, "likes").slice(0, 3)}
            moreHref={buildHref(basePath, { ...filters, sort: "likes" })}
          />
          <DiscoverySection
            title="Mais comentados"
            projects={sortProjects(result.allProjects, "comments").slice(0, 3)}
            moreHref={buildHref(basePath, { ...filters, sort: "comments" })}
          />
          <DiscoverySection
            title="Recentemente atualizados"
            projects={sortProjects(result.allProjects, "updated").slice(0, 3)}
            moreHref={buildHref(basePath, { ...filters, sort: "updated" })}
          />
          <DiscoverySection
            title="Novos projetos"
            projects={sortProjects(result.allProjects, "recent").slice(0, 3)}
            moreHref={buildHref(basePath, { ...filters, sort: "recent" })}
          />
        </div>
      ) : null}

      <section className="order-1 mt-7 md:mt-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-muted">
          {result.source === "supabase" ? "Projetos reais" : "Modo demo"}
            </p>
            <h2 className="mt-1 font-title text-2xl tracking-tight">
              {hasFilters
                ? filters.q
                  ? `Resultados para "${filters.q}"`
                  : "Resultados filtrados"
                : result.projects.length
                  ? `${result.projects.length.toLocaleString("pt-BR")} projetos`
                  : "Nenhum resultado"}
            </h2>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={basePath}>Limpar filtros</Link>
          </Button>
        </div>

        <ProjectGrid
          projects={pageData.items}
          eagerFirstImage
          emptyTitle={emptyTitle}
          emptyDescription={
            hasFilters
              ? "Tente buscar por Gol, JDM, off-road, turbo, stance ou limpe os filtros para voltar ao catalogo completo."
              : "Adicione um projeto novo ou aguarde a primeira publicacao real aparecer por aqui."
          }
          emptyAction={
            hasFilters ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href={basePath}>Remover filtros</Link>
                </Button>
                {QUICK_SEARCHES.slice(0, 4).map((query) => (
                  <Button key={query} asChild variant="outline">
                    <Link
                      href={buildHref(basePath, {
                        q: query,
                        brand: "",
                        model: "",
                        year: "",
                        fuel: "",
                        induction: "",
                        drivetrain: "",
                        category: "",
                        style: "",
                        engine: "",
                        tag: "",
                        sort: "relevance",
                      })}
                    >
                      {query}
                    </Link>
                  </Button>
                ))}
              </div>
            ) : (
              <Button asChild>
                <Link href="/criar-projeto">Adicionar meu primeiro projeto</Link>
              </Button>
            )
          }
        />

        {pageData.totalPages > 1 ? (
          <Card className="mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Pagina {pageData.page} de {pageData.totalPages}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={pageData.page <= 1}
              >
                <Link href={buildHref(basePath, filters, pageData.page - 1)}>Anterior</Link>
              </Button>
              {Array.from({ length: pageData.totalPages }, (_, index) => index + 1)
                .slice(0, 5)
                .map((page) => (
                  <Button
                    key={page}
                    asChild
                    size="sm"
                    variant={page === pageData.page ? "default" : "outline"}
                  >
                    <Link href={buildHref(basePath, filters, page)}>{page}</Link>
                  </Button>
                ))}
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={pageData.page >= pageData.totalPages}
              >
                <Link href={buildHref(basePath, filters, pageData.page + 1)}>Proxima</Link>
              </Button>
            </div>
          </Card>
        ) : null}
      </section>
      </div>
    </div>
  );
}
