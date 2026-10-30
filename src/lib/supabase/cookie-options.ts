/** Supabase SSR needs browser-readable cookies. Preserve its HttpOnly/SameSite defaults. */
export function supabaseCookieOptions() {
  // HTTPS dev previews also need Secure; HTTP localhost remains usable.
  return { secure: typeof window !== "undefined"
    ? window.location.protocol === "https:"
    : process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") === true };
}
