const DEFAULT_SUPABASE_URL = "https://hxqhudfzdwfxnjzmphya.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_3aeMjOMCyHGqNudGMI470g_Ekc5qTBu";
const DEFAULT_SITE_URL = "https://projetogaragem.netlify.app";

function trimEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const supabaseUrl =
  trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey =
  trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
export const configuredSiteUrl = normalizeBaseUrl(
  trimEnvValue(process.env.NEXT_PUBLIC_SITE_URL) || DEFAULT_SITE_URL
);

export function getSiteUrl() {
  const siteUrl =
    trimEnvValue(process.env.NEXT_PUBLIC_SITE_URL) ||
    (typeof window !== "undefined" ? trimEnvValue(window.location.origin) : DEFAULT_SITE_URL);

  return normalizeBaseUrl(siteUrl || DEFAULT_SITE_URL);
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
