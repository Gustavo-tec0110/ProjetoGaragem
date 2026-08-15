import { cache } from "react";
import type { Metadata } from "next";

import { demoProjects } from "@/lib/projects/demo-projects";
import { mapCarCardToProject, mapCarDetailsToProject } from "@/lib/projects/mappers";
import type {
  Project,
  ProjectCollectionResult,
  ProjectFilters,
  ProjectRecommendationGroups,
  ProjectSortKey,
} from "@/lib/projects/types";
import {
  buildProjectHref,
  filterProjects,
  getAvailableBrands,
  getAvailableDrivetrains,
  getAvailableEngines,
  getAvailableFuels,
  getAvailableInductions,
  getAvailableModels,
  getAvailableStyles,
  getAvailableYears,
  getSimilarProjects,
  getTrendingProjects,
  normalizeSearchText,
  normalizeProjectFilters,
  sortProjects,
  uniqueProjects,
} from "@/lib/projects/utils";
import { createSeoMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { qCarBySlug, qExploreCars } from "@/lib/supabase/queries";

const PROJECT_LIMIT = 120;
const FEATURED_DEMO_SLUGS = [
  "gol-quadrado-1994-ap18",
  "subaru-impreza-wrx-2002-awd",
  "uno-turbo-street",
] as const;

const getSupabaseProjectCatalog = cache(async (filters?: ProjectFilters, personalize = true) => {
  if (!isSupabaseConfigured) {
    return { projects: [] as Project[], error: "not_configured" as const };
  }

  const querySort =
    filters?.sort === "likes" ||
    filters?.sort === "comments" ||
    filters?.sort === "views" ||
    filters?.sort === "updated" ||
    filters?.sort === "popular"
      ? filters.sort
      : "recent";
  const result = await qExploreCars({
    q: filters?.q,
    brand: filters?.brand,
    model: filters?.model,
    year: filters?.year,
    fuel: filters?.fuel,
    induction: filters?.induction,
    drivetrain: filters?.drivetrain,
    category: filters?.category || filters?.style,
    engine: filters?.engine,
    tag: filters?.tag,
    sort: querySort,
    limit: PROJECT_LIMIT,
  }, { personalize });
  if (result.error) {
    return { projects: [] as Project[], error: result.error };
  }

  return {
    projects: (result.data ?? []).map(mapCarCardToProject),
    error: null,
  };
});

const getSupabaseProjectDetailsBySlug = cache(async (slug: string) => {
  if (!isSupabaseConfigured) return null;

  const result = await qCarBySlug(slug);
  return result.data ?? null;
});

async function getRouteProjectBySlug(slug: string) {
  const detail = await getSupabaseProjectDetailsBySlug(slug);
  if (detail) {
    return {
      project: mapCarDetailsToProject(detail),
      detail,
    };
  }

  const project =
    demoProjects.find((entry) => entry.slug === slug || entry.id === slug) ?? null;

  return {
    project,
    detail: null,
  };
}

function emptyProjectRecommendations(): ProjectRecommendationGroups {
  return {
    similar: [],
    sameCreator: [],
    sameModel: [],
    sameBrand: [],
    popular: [],
  };
}

async function getProjectRecommendationsForRoute(project: Project): Promise<ProjectRecommendationGroups> {
  const collection = await getProjectCollection(undefined, false);
  const combinedProjects = uniqueProjects([...collection.allProjects, ...demoProjects]);
  const candidates = combinedProjects.filter((entry) => entry.slug !== project.slug);
  const usedSlugs = new Set([project.slug]);

  const takeFresh = (projects: Project[], limit = 3) => {
    const fresh = projects.filter((entry) => !usedSlugs.has(entry.slug)).slice(0, limit);
    for (const entry of fresh) usedSlugs.add(entry.slug);
    return fresh;
  };

  const creatorKey = project.ownerId || project.ownerUsername || project.ownerName;
  const sameCreator = creatorKey
    ? takeFresh(
        sortProjects(
          candidates.filter((entry) => {
            const entryKey = entry.ownerId || entry.ownerUsername || entry.ownerName;
            return entryKey === creatorKey;
          }),
          "updated"
        )
      )
    : [];

  const projectModel = normalizeSearchText(project.model || project.carModel);
  const sameModel = projectModel
    ? takeFresh(
        sortProjects(
          candidates.filter((entry) => normalizeSearchText(entry.model || entry.carModel) === projectModel),
          "popular"
        )
      )
    : [];

  const projectBrand = normalizeSearchText(project.brand);
  const sameBrand = projectBrand
    ? takeFresh(
        sortProjects(
          candidates.filter((entry) => normalizeSearchText(entry.brand) === projectBrand),
          "popular"
        )
      )
    : [];

  return {
    sameCreator,
    sameModel,
    sameBrand,
    similar: takeFresh(getSimilarProjects(combinedProjects, project, 6)),
    popular: takeFresh(sortProjects(candidates, "popular"), 3),
  };
}

export async function getProjectCollection(
  filters?: Partial<ProjectFilters>,
  personalize = true
): Promise<ProjectCollectionResult> {
  const normalizedFilters = normalizeProjectFilters(filters);
  const catalog = await getSupabaseProjectCatalog(normalizedFilters, personalize);
  const allProjects = uniqueProjects([...demoProjects, ...catalog.projects]);

  const filteredProjects = sortProjects(
    filterProjects(allProjects, normalizedFilters),
    normalizedFilters.sort,
    normalizedFilters.q
  );

  return {
    projects: filteredProjects,
    allProjects,
    availableStyles: getAvailableStyles(allProjects),
    availableEngines: getAvailableEngines(allProjects),
    availableBrands: getAvailableBrands(allProjects),
    availableModels: getAvailableModels(allProjects),
    availableYears: getAvailableYears(allProjects),
    availableFuels: getAvailableFuels(allProjects),
    availableInductions: getAvailableInductions(allProjects),
    availableDrivetrains: getAvailableDrivetrains(allProjects),
    availableCategories: getAvailableStyles(allProjects),
    source: catalog.projects.length > 0 ? "supabase" : "demo",
    notice:
      catalog.projects.length > 0
        ? null
        : catalog.error === "not_configured"
          ? "Mostrando projetos demo enquanto o Supabase nao e configurado."
          : catalog.error
            ? "Mostrando projetos demo enquanto a conexao com o banco e revisada."
            : "Mostrando projetos demo ate a primeira garagem real ser publicada.",
  };
}

export const getFeaturedProjects = cache(
  async (limit = 6, sort: ProjectSortKey = "likes") => {
    const querySort =
      sort === "likes" ||
      sort === "comments" ||
      sort === "views" ||
      sort === "updated" ||
      sort === "popular" ||
      sort === "hot" ||
      sort === "recent"
        ? sort
        : null;

    let featuredPool: Project[] = demoProjects;
    if (isSupabaseConfigured && querySort) {
      const result = await qExploreCars(
        { sort: querySort, limit: Math.max(1, limit) },
        { personalize: false }
      );
      if (result.data?.length) {
        featuredPool = uniqueProjects([
          ...demoProjects,
          ...result.data.map(mapCarCardToProject),
        ]);
      }
    }

    const sortedProjects = sortProjects(featuredPool, sort);
    const projectsBySlug = new Map(
      sortedProjects.map((project) => [project.slug, project])
    );
    const priorityProjects = FEATURED_DEMO_SLUGS.flatMap((slug) => {
      const project = projectsBySlug.get(slug);
      return project ? [project] : [];
    });
    const prioritySlugs = new Set<string>(FEATURED_DEMO_SLUGS);
    const remainingProjects = sortedProjects.filter(
      (project) => !prioritySlugs.has(project.slug)
    );

    return [...priorityProjects, ...remainingProjects].slice(0, limit);
  }
);

const getProjectBySlug = cache(async (slug: string) => {
  const { project } = await getRouteProjectBySlug(slug);
  return project;
});

export async function getProjectPageData(slug: string) {
  const { project, detail } = await getRouteProjectBySlug(slug);
  if (!project) {
    return {
      project: null,
      detail: null,
      similarProjects: [] as Project[],
      recommendations: emptyProjectRecommendations(),
    };
  }

  const recommendations = await getProjectRecommendationsForRoute(project);

  return {
    project,
    detail,
    similarProjects: recommendations.similar,
    recommendations,
  };
}

export async function getProjectRouteMetadata(
  slug: string,
  routeVariant: "project" | "car",
  missingTitle: string,
  missingDescription: string
): Promise<Metadata> {
  const project = await getProjectBySlug(slug);
  const canonicalPath = buildProjectHref(slug);
  const currentPath = routeVariant === "car" ? `/carros/${slug}` : canonicalPath;

  if (!project) {
    return createSeoMetadata({
      title: missingTitle,
      description: missingDescription,
      path: currentPath,
      canonicalPath,
      noIndex: routeVariant === "car",
    });
  }

  return createSeoMetadata({
    title: project.title,
    description: project.shortDescription,
    path: currentPath,
    canonicalPath,
    image: project.mainImage,
    keywords: project.tags,
    type: "article",
  });
}

export async function getProjectRankings(limit = 6) {
  const collection = await getProjectCollection(undefined, false);
  const allProjects = collection.allProjects;

  return {
    allProjects,
    source: collection.source,
    notice: collection.notice,
    trending: getTrendingProjects(allProjects, limit),
    mostLiked: sortProjects(allProjects, "likes").slice(0, limit),
    mostCommented: sortProjects(allProjects, "comments").slice(0, limit),
    mostViewed: sortProjects(allProjects, "views").slice(0, limit),
    mostSaved: [...allProjects]
      .sort((left, right) => right.saves - left.saves || right.likes - left.likes)
      .slice(0, limit),
    mostRecent: sortProjects(allProjects, "recent").slice(0, limit),
    mostUpdated: sortProjects(allProjects, "updated").slice(0, limit),
  };
}

export async function getProjectsBySlugs(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  const projects = await Promise.all(uniqueSlugs.map((slug) => getProjectBySlug(slug)));
  return projects.filter((project): project is Project => Boolean(project));
}
