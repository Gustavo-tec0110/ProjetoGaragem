import type { Metadata } from "next";

import { configuredSiteUrl } from "@/lib/supabase/env";

export const SITE_NAME = "Projeto Garagem";
export const SITE_DESCRIPTION =
  "Crie sua garagem. Documente seus carros, peças, fotos e evolução. Compartilhe seus projetos com a comunidade automotiva.";
const SITE_FALLBACK_IMAGE = "/og-image.jpg";

export function getSiteUrl() {
  return configuredSiteUrl;
}

function toAbsoluteUrl(path: string | null | undefined) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, `${getSiteUrl()}/`).toString();
}

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  canonicalPath?: string;
  image?: string | null;
  keywords?: string[];
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
};

export function createSeoMetadata({
  title = SITE_NAME,
  description = SITE_DESCRIPTION,
  path = "/",
  canonicalPath,
  image = SITE_FALLBACK_IMAGE,
  keywords,
  type = "website",
  noIndex = false,
}: SeoInput): Metadata {
  const canonical = canonicalPath ?? path;
  const resolvedImage = toAbsoluteUrl(image || SITE_FALLBACK_IMAGE);
  const resolvedUrl = toAbsoluteUrl(canonical);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: resolvedUrl,
      images: resolvedImage ? [{ url: resolvedImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: resolvedImage ? [resolvedImage] : undefined,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
