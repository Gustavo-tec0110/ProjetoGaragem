import type { MetadataRoute } from "next";

import { getProjectCollection } from "@/lib/projects/server";
import { getSiteUrl } from "@/lib/seo";

const STATIC_ROUTES = [
  "",
  "/explorar",
  "/atualizacoes",
  "/comparar",
  "/rankings",
  "/criar-projeto",
  "/login",
  "/register",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const collection = await getProjectCollection();
  const projectRoutes = collection.allProjects.slice(0, 500).map((project) => ({
    url: `${siteUrl}/projeto/${project.slug}`,
    lastModified: new Date(project.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    ...STATIC_ROUTES.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...projectRoutes,
  ];
}
