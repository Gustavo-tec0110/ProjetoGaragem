export const PROJECT_MEDIA_PREFIX = "/api/media/project/";
const STORAGE_PREFIX = "/storage/v1/object/public/project-images/";

/** Canonical, decoded object keys only. Never pass a client URL to fetch(). */
export function isProjectImagePath(path: string) {
  return path.length <= 1024 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9_.-]+\.(?:webp|png|jpe?g)$/i.test(path) &&
    !path.split("/").some((part) => part === "." || part === ".." || part.startsWith("."));
}

export function projectImageUrl(path: string) {
  if (!isProjectImagePath(path)) throw new Error("Invalid project image path");
  return `${PROJECT_MEDIA_PREFIX}${path}`;
}

export function projectImagePathFromUrl(value: string, storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") {
  let path: string;
  if (value.startsWith(PROJECT_MEDIA_PREFIX)) {
    path = value.slice(PROJECT_MEDIA_PREFIX.length);
  } else {
    try {
      const url = new URL(value);
      if (!storageOrigin || url.origin !== new URL(storageOrigin).origin ||
        !url.pathname.startsWith(STORAGE_PREFIX) || url.search || url.hash || url.username || url.password) return null;
      path = url.pathname.slice(STORAGE_PREFIX.length);
    } catch {
      return null;
    }
  }
  return isProjectImagePath(path) ? path : null;
}

/** Convert legacy references at server/client boundaries without rewriting the DB. */
export function protectedImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = projectImagePathFromUrl(value);
  return path ? projectImageUrl(path) : value;
}

/** Also block malformed/signed/transform variants from the shared optimizer. */
export function isProtectedImageSource(value: string) {
  return value.includes(PROJECT_MEDIA_PREFIX) || value.includes("/project-images/");
}
