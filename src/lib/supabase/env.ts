const DEFAULT_SUPABASE_URL = "https://hxqhudfzdwfxnjzmphya.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_3aeMjOMCyHGqNudGMI470g_Ekc5qTBu";
const DEFAULT_SITE_URL = "https://projetogaragem.netlify.app";

function trimEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function toBaseUrl(value: string | undefined) {
  const trimmed = trimEnvValue(value);
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function getConfiguredSiteUrl() {
  if (process.env.NODE_ENV === "production") return DEFAULT_SITE_URL;

  const envSiteUrl = toBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return envSiteUrl || DEFAULT_SITE_URL;
}

export const supabaseUrl =
  trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey =
  trimEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
export const configuredSiteUrl = getConfiguredSiteUrl();

export function getRequestSiteUrl(requestOrigin?: string) {
  if (process.env.NODE_ENV === "production") return DEFAULT_SITE_URL;

  const origin = toBaseUrl(requestOrigin);
  return origin || configuredSiteUrl;
}

export function getSiteUrl() {
  if (process.env.NODE_ENV === "production") return DEFAULT_SITE_URL;

  const browserOrigin =
    typeof window !== "undefined" ? toBaseUrl(window.location.origin) : "";

  return getRequestSiteUrl(browserOrigin);
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
