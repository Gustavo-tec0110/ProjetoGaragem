const DEFAULT_AUTH_REDIRECT = "/garagem";

export function getSafeNextPath(next: string | null | undefined) {
  if (!next?.startsWith("/") || next.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return next;
}
