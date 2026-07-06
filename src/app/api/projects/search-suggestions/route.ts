import { NextResponse } from "next/server";

import { demoProjects } from "@/lib/projects/demo-projects";
import { normalizeSearchText } from "@/lib/projects/utils";
import { qProjectSearchSuggestions } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Suggestion = {
  term: string;
  source: string;
  rank: number;
};

function demoSuggestions(query: string, limit: number): Suggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  const candidates = demoProjects.flatMap((project) => [
    { term: project.title, source: "Projeto", rank: 74 },
    { term: project.brand ?? "", source: "Marca", rank: 80 },
    { term: project.model ?? "", source: "Modelo", rank: 78 },
    { term: project.engine, source: "Motor", rank: 68 },
    { term: project.style, source: "Estilo", rank: 72 },
    ...project.tags.map((tag) => ({
      term: tag.replace(/^#+/, ""),
      source: "Tag",
      rank: 76,
    })),
  ]);

  const unique = new Map<string, Suggestion>();
  for (const candidate of candidates) {
    const term = candidate.term.trim();
    if (!term) continue;

    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm.includes(normalizedQuery)) continue;

    const ranked = {
      ...candidate,
      term,
      rank: candidate.rank + (normalizedTerm.startsWith(normalizedQuery) ? 20 : 0),
    };
    const key = `${ranked.source}:${normalizeSearchText(ranked.term)}`;
    const current = unique.get(key);
    if (!current || ranked.rank > current.rank) unique.set(key, ranked);
  }

  return Array.from(unique.values())
    .sort((left, right) => right.rank - left.rank || left.term.length - right.term.length)
    .slice(0, limit);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = 8;

  if (query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await qProjectSearchSuggestions(query, limit);

  if (result.error || !result.data?.length) {
    return NextResponse.json({ suggestions: demoSuggestions(query, limit) });
  }

  return NextResponse.json({ suggestions: result.data });
}
