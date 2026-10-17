import { isProjectImagePath } from "./project-image-url";

export const MEDIA_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type DeliveryDependencies = {
  authorize: (path: string) => Promise<boolean | null>;
  download: (path: string) => Promise<Blob | null>;
  transform?: (blob: Blob) => Promise<Blob>;
};

/** No redirects, signed tokens, 304s, ranges or shared caches. Recheck after I/O. */
export async function deliverProjectImage(path: string, dependencies: DeliveryDependencies, head = false) {
  const error = (status: number) => new Response(null, { status, headers: MEDIA_NO_STORE_HEADERS });
  if (!isProjectImagePath(path)) return error(404);
  try {
    const permitted = await dependencies.authorize(path);
    if (permitted === null) return error(503);
    if (!permitted) return error(404);
    let blob = await dependencies.download(path);
    if (!blob) return error(404);
    if (!["image/webp", "image/png", "image/jpeg", "image/jpg", "image/pjpeg"].includes(blob.type)) return error(404);
    if (dependencies.transform) blob = await dependencies.transform(blob);
    const stillPermitted = await dependencies.authorize(path);
    if (stillPermitted === null) return error(503);
    if (!stillPermitted) return error(404);
    return new Response(head ? null : blob, {
      status: 200,
      headers: { ...MEDIA_NO_STORE_HEADERS, "Content-Type": blob.type, "Content-Length": String(blob.size) },
    });
  } catch {
    return error(503);
  }
}
