import { NextResponse } from "next/server";

import { qProjectSearchSuggestions } from "@/lib/supabase/queries";
import { allowRequest } from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rate = allowRequest(request.headers, "search-suggestions", 30, 60_000);
  if (!rate.ok) return NextResponse.json({ suggestions: [] }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 80);
  const limit = 8;

  if (query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await qProjectSearchSuggestions(query, limit);

  return NextResponse.json({ suggestions: result.error ? [] : result.data ?? [] });
}
