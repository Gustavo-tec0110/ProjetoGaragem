import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getPostTermsPath } from "@/lib/auth/redirect";

export async function hasCurrentTerms(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc("has_current_terms_acceptance");
  return !error && data === true;
}

export function termsDestination(next: string) {
  return `/accept-terms?next=${encodeURIComponent(getPostTermsPath(next))}`;
}
