import "server-only";

import { getSupabasePublicClient } from "@/lib/supabase/server";

export type PublicProfileSearchResult = {
  username: string;
  display_name: string | null;
};

/** Search only the anonymous public view; never select emails or full names. */
export async function searchPublicProfiles(query: string, limit = 8): Promise<{
  data: PublicProfileSearchResult[];
  error: boolean;
}> {
  const term = query.trim().replace(/^@/, "").slice(0, 80);
  // PostgREST treats an asterisk as a LIKE wildcard even inside quoted operands.
  if (term.length < 2 || term.includes("*") || !/[\p{L}\p{N}]/u.test(term)) return { data: [], error: false };
  const client = getSupabasePublicClient();
  if (!client) return { data: [], error: false };
  // Quote the PostgREST operand and escape SQL wildcard characters independently.
  const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`.replace(/[\\"]/g, "\\$&");
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(12, Math.floor(limit))) : 8;
  const { data, error } = await client.from("public_profiles")
    .select("username,display_name")
    .or(`username.ilike."${pattern}",display_name.ilike."${pattern}"`)
    .not("username", "is", null)
    .order("username")
    .limit(safeLimit);
  return {
    data: error ? [] : (data ?? []).flatMap(row => row.username ? [{ username: row.username, display_name: row.display_name }] : []),
    error: Boolean(error),
  };
}
