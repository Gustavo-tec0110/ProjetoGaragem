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
