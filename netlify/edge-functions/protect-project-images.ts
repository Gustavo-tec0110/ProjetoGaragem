/** The native Netlify Image CDN bypasses Next Route Handlers. Allow only
 * immutable shipped assets and the same external public hosts as next.config.
 * Every dynamic project/OG/Storage source, including aliases, is denied before
 * an old CDN entry can be served. No extra service or secret is required. */
export default async function protectProjectImages(request: Request, context: { next: () => Promise<Response> }) {
  const requestUrl = new URL(request.url);
  const sources = requestUrl.searchParams.getAll("url");
  let allowed = false;
  if (sources.length === 1 && sources[0].length <= 2048) {
    try {
      const source = new URL(sources[0], requestUrl);
      if (!source.username && !source.password && !source.pathname.includes("%") && !source.hash) {
        const shipped = source.origin === requestUrl.origin && !source.search &&
          (source.pathname.startsWith("/ref/") || source.pathname.startsWith("/modifications/") ||
            source.pathname.startsWith("/_next/static/media/") || source.pathname === "/og-image.jpg");
        const external = source.protocol === "https:" && !source.port && (
          (source.hostname === "images.unsplash.com" && source.pathname.startsWith("/photo-")) ||
          (source.hostname === "lh3.googleusercontent.com" && !source.search)
        );
        allowed = shipped || external;
      }
    } catch { /* Invalid sources fail closed. */ }
  }
  if (!allowed) return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Netlify-CDN-Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  });
  return context.next();
}
