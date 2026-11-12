import { NextResponse } from "next/server";

import { qProjectSearchSuggestions } from "@/lib/supabase/queries";
import { allowRequest } from "@/lib/security/request-rate-limit";
import { searchPublicProfiles } from "@/lib/search/public-profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const rate = allowRequest(request.headers, "search-suggestions", 30, 60_000);
  if (!rate.ok) return NextResponse.json({ suggestions: [] }, { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } });
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 80);
  const limit = 8;

  if (query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] }, { headers });
  }

  const [result, profiles] = await Promise.all([
    qProjectSearchSuggestions(query, limit), searchPublicProfiles(query, 4),
  ]);
  // Failures must remain retryable, rather than being cached by the UI as no matches.
  if (result.error || profiles.error) return NextResponse.json({ suggestions: [] }, { status: 503, headers });
  const users = profiles.data.map(profile => ({
    term: profile.display_name ? `${profile.display_name} (@${profile.username})` : `@${profile.username}`,
    source: "Usuário", href: `/perfil/${encodeURIComponent(profile.username)}`,
  }));
  return NextResponse.json({ suggestions: [...users, ...(result.data ?? [])].slice(0, limit) }, { headers });
}
