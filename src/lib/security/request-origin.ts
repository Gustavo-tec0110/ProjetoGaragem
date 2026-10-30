/** Browser mutations are same-origin. Missing Origin remains compatible with API clients. */
export function hasTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  try {
    const target = new URL(request.url);
    // Next dev can reconstruct request.url with localhost for a 127.0.0.1 Host.
    // Browsers bind Host to the actual request destination; never trust a
    // caller's X-Forwarded-Host/Origin override to authorize a browser mutation.
    const host = request.headers.get("host");
    if (host) {
      if (!/^[a-z0-9.:[\]-]+$/i.test(host)) return false;
      target.host = new URL(`${target.protocol}//${host}`).host;
    }
    return new URL(origin).origin === target.origin && origin !== "null";
  } catch { return false; }
}
