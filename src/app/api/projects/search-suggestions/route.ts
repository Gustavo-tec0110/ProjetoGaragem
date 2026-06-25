import { NextResponse } from "next/server";

import { qProjectSearchSuggestions } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await qProjectSearchSuggestions(query, 8);

  if (result.error) {
    return NextResponse.json({ suggestions: [] });
  }

  return NextResponse.json({ suggestions: result.data ?? [] });
}
