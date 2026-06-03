import type { Metadata } from "next";

import {
  ProjectRankingsBoard,
  isRankingCategoryKey,
} from "@/components/projects/project-rankings-board";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { getProjectRankings } from "@/lib/projects/server";
import { createSeoMetadata } from "@/lib/seo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getCategoryLabel(category: string) {
  if (category === "curtidos") return "Mais curtidos";
  if (category === "vistos") return "Mais vistos";
  if (category === "salvos") return "Mais salvos";
  if (category === "off-road") return "Off-road";
  if (category === "classicos") return "Classicos";
  if (category === "sleeper") return "Sleeper";
  if (category === "jdm") return "JDM";
  if (category === "turbo") return "Turbo";
  if (category === "stance") return "Stance";
  return "Geral";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const category = param(params, "categoria");
  const validCategory = isRankingCategoryKey(category) ? category : "geral";
  const label = getCategoryLabel(validCategory);

  return createSeoMetadata({
    title:
      validCategory === "geral"
        ? "Ranking de Projetos"
        : `Ranking de Projetos: ${label}`,
    description:
      "Veja os projetos mais curtidos, vistos, salvos e em destaque em uma area especial de ranking da comunidade.",
    path:
      validCategory === "geral"
        ? "/rankings"
        : `/rankings?categoria=${encodeURIComponent(validCategory)}`,
    canonicalPath: "/rankings",
  });
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const category = param(params, "categoria");
  const rankings = await getProjectRankings(12);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <ProjectRankingsBoard
          projects={rankings.allProjects}
          selectedCategoryKey={isRankingCategoryKey(category) ? category : "geral"}
          source={rankings.source}
          notice={rankings.notice}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
