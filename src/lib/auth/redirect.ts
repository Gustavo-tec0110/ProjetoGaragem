const DEFAULT_AUTH_REDIRECT = "/garagem";

export function getSafeNextPath(next: string | null | undefined) {
  if (!next?.startsWith("/") || next.startsWith("//") ||
    Array.from(next).some((character) => character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    return DEFAULT_AUTH_REDIRECT;
  }
  try {
    const origin = "https://projetogaragem.invalid";
    const destination = new URL(next, origin);
    const safePath = `${destination.pathname}${destination.search}${destination.hash}`;
    if (destination.origin !== origin || !destination.pathname.startsWith("/") ||
      destination.pathname.startsWith("//") || new URL(safePath, origin).origin !== origin ||
      /%(?:2f|5c|00|0[0-9a-f]|1[0-9a-f]|7f)/i.test(next)) {
      return DEFAULT_AUTH_REDIRECT;
    }
    return safePath;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

// Login pages use their requested destination; project invitations use their current URL.
export function getGoogleNextPath(next: string | null | undefined, pathname: string, search: string) {
  const authPage = ["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname);
  const candidate = next ?? (authPage ? new URLSearchParams(search).get("next") : `${pathname}${search}`);
  const safe = candidate?.startsWith("/accept-terms?") || candidate?.startsWith("/accept-terms/?")
    ? getPostTermsPath(candidate) : getSafeNextPath(candidate);
  const destination = new URL(safe, "https://projetogaragem.invalid").pathname.replace(/\/$/, "");
  return ["/login", "/register", "/forgot-password", "/reset-password"].includes(destination) || destination.startsWith("/auth/")
    ? DEFAULT_AUTH_REDIRECT : safe;
}

// Flatten a resumed acceptance URL once, preserving the original safe destination.
export function getPostTermsPath(next: string | null | undefined) {
  let candidate = next;
  if (next?.startsWith("/accept-terms?") || next?.startsWith("/accept-terms/?")) {
    candidate = new URL(next, "https://projetogaragem.invalid").searchParams.get("next");
  }
  const safe = getSafeNextPath(candidate);
  const pathname = new URL(safe, "https://projetogaragem.invalid").pathname.replace(/\/$/, "");
  return ["/accept-terms", "/login", "/register", "/forgot-password"].includes(pathname) || pathname.startsWith("/auth/")
    ? DEFAULT_AUTH_REDIRECT : safe;
}
