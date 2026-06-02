import { cache } from "react";
import type { Metadata } from "next";

import { demoProjects } from "@/lib/projects/demo-projects";
import { mapCarCardToProject, mapCarDetailsToProject } from "@/lib/projects/mappers";
import type {
  Project,
  ProjectCollectionResult,
  ProjectFilters,
  ProjectSortKey,
} from "@/lib/projects/types";
import {
  buildProjectHref,
  filterProjects,
  getAvailableEngines,
  getAvailableStyles,
  getSimilarProjects,
  getTrendingProjects,
  normalizeProjectFilters,
  sortProjects,
  uniqueProjects,
} from "@/lib/projects/utils";
import { createSeoMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { qCarBySlug, qExploreCars } from "@/lib/supabase/queries";

const PROJECT_LIMIT = 120;

const getSupabaseProjectCatalog = cache(async () => {
  if (!isSupabaseConfigured) {
    return { projects: [] as Project[], error: "not_configured" as const };
  }

  const result = await qExploreCars({ sort: "recent", limit: PROJECT_LIMIT });
  if (result.error) {
    return { projects: [] as Project[], error: result.error };
  }

  return {
    projects: (result.data ?? []).map(mapCarCardToProject),
    error: null,
  };
});

export const getSupabaseProjectDetailsBySlug = cache(async (slug: string) => {
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

async function getSimilarProjectsForRoute(project: Project) {
  const collection = await getProjectCollection();
  const combinedProjects = uniqueProjects([...collection.allProjects, ...demoProjects]);
  return getSimilarProjects(combinedProjects, project, 3);
}

export async function getProjectCollection(
  filters?: Partial<ProjectFilters>
): Promise<ProjectCollectionResult> {
  const normalizedFilters = normalizeProjectFilters(filters);
  const catalog = await getSupabaseProjectCatalog();

  if (catalog.error || catalog.projects.length === 0) {
    const filteredDemo = sortProjects(
      filterProjects(demoProjects, normalizedFilters),
      normalizedFilters.sort
    );

    return {
      projects: filteredDemo,
      allProjects: demoProjects,
      availableStyles: getAvailableStyles(demoProjects),
      availableEngines: getAvailableEngines(demoProjects),
      source: "demo",
      notice:
        catalog.error === "not_configured"
          ? "Mostrando projetos demo enquanto o Supabase nao e configurado."
          : catalog.error
            ? "Mostrando projetos demo enquanto a conexao com o banco e revisada."
            : "Mostrando projetos demo ate a primeira garagem real ser publicada.",
    };
  }

  const filteredProjects = sortProjects(
    filterProjects(catalog.projects, normalizedFilters),
    normalizedFilters.sort
  );

  return {
    projects: filteredProjects,
    allProjects: catalog.projects,
    availableStyles: getAvailableStyles(catalog.projects),
    availableEngines: getAvailableEngines(catalog.projects),
    source: "supabase",
    notice: null,
  };
}

export const getFeaturedProjects = cache(
  async (limit = 6, sort: ProjectSortKey = "likes") => {
    const collection = await getProjectCollection({ sort });
    return sortProjects(collection.allProjects, sort).slice(0, limit);
  }
);

export const getProjectBySlug = cache(async (slug: string) => {
  const { project } = await getRouteProjectBySlug(slug);
  return project;
});

export async function getProjectPageData(slug: string) {
  const { project, detail } = await getRouteProjectBySlug(slug);
  if (!project) {
    return { project: null, detail: null, similarProjects: [] as Project[] };
  }

  return {
    project,
    detail,
    similarProjects: await getSimilarProjectsForRoute(project),
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
  const collection = await getProjectCollection();
  const allProjects = collection.allProjects;

  return {
    source: collection.source,
    notice: collection.notice,
    trending: getTrendingProjects(allProjects, limit),
    mostLiked: sortProjects(allProjects, "likes").slice(0, limit),
    mostViewed: sortProjects(allProjects, "views").slice(0, limit),
    mostRecent: sortProjects(allProjects, "recent").slice(0, limit),
    mostUpdated: sortProjects(allProjects, "updated").slice(0, limit),
  };
}

export async function getProjectsBySlugs(slugs: string[]) {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  const projects = await Promise.all(uniqueSlugs.map((slug) => getProjectBySlug(slug)));
  return projects.filter((project): project is Project => Boolean(project));
}
