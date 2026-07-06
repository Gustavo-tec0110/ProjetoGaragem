import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/garagem", "/onboarding"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
