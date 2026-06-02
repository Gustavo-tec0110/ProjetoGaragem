import type { Metadata } from "next";

export const SITE_NAME = "Projeto Garagem";
export const SITE_DESCRIPTION =
  "Crie a ficha publica do seu carro e descubra projetos automotivos reais da comunidade.";
export const SITE_FALLBACK_IMAGE = "/ref/hero-car.jpg";

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "http://localhost:3000";

  return normalizeBaseUrl(raw);
}

export function toAbsoluteUrl(path: string | null | undefined) {
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
