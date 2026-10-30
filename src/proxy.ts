import { hasCurrentTerms, termsDestination } from "@/lib/auth/terms-server";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";
import { logPerformance, performanceTimer } from "@/lib/performance";
import { isProtectedImageSource } from "@/lib/images/project-image-url";
import { MEDIA_NO_STORE_HEADERS } from "@/lib/images/delivery";

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/garagem") ||
    pathname === "/criar-projeto" ||
    pathname === "/carros/novo" ||
    (pathname.startsWith("/projeto/") && pathname.endsWith("/editar")) ||
    (pathname.startsWith("/carros/") && pathname.endsWith("/editar")) ||
    pathname.startsWith("/onboarding")
  );
}

function buildNextParam(url: URL) {
  const pathname = url.pathname;
  const search = url.search;
  return `${pathname}${search}`;
}

export async function proxy(request: NextRequest) {
  // Runs BEFORE the optimizer cache, including requests for former public URLs.
  if (request.nextUrl.pathname === "/_next/image") {
    const source = request.nextUrl.searchParams.get("url") ?? "";
    if (isProtectedImageSource(source)) {
      return new NextResponse(null, { status: 404, headers: MEDIA_NO_STORE_HEADERS });
    }
    return NextResponse.next();
  }
  const timer = performanceTimer("request", "proxy", {
    method: request.method,
    pathname: request.nextUrl.pathname,
  });

  if (!isSupabaseConfigured) {
    const response = NextResponse.next({ request: { headers: request.headers } });
    const durationMs = timer.end({ configured: false });
    response.headers.set("Server-Timing", `pg-proxy;dur=${durationMs.toFixed(1)}`);
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const nextParam = buildNextParam(request.nextUrl);

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Atualiza cookies no request (para Server Components) e no response (para o browser)
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const authStartedAt = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  logPerformance("auth", "proxy.getUser", performance.now() - authStartedAt, {
    pathname,
    authenticated: Boolean(user),
  });

  if (!user && isProtectedPath(pathname)) {
    // Access-control redirects stay on the origin that served this request.
    // Canonical URLs belong to SEO and OAuth configuration, not RSC navigation.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextParam);
    const redirectResponse = NextResponse.redirect(loginUrl);
    const durationMs = timer.end({ authenticated: false, outcome: "redirect" });
    redirectResponse.headers.set("Server-Timing", `pg-proxy;dur=${durationMs.toFixed(1)}`);
    return redirectResponse;
  }

  if (user && isProtectedPath(pathname) && !await hasCurrentTerms(supabase)) {
    const blocked = request.method === "GET" || request.method === "HEAD"
      ? NextResponse.redirect(new URL(termsDestination(nextParam), request.url))
      : NextResponse.json({ message: "Conclua o aceite dos Termos de Uso.", redirectTo: termsDestination(nextParam) }, { status: 403 });
    for (const cookie of response.cookies.getAll()) blocked.cookies.set(cookie);
    blocked.headers.set("Cache-Control", "no-store");
    return blocked;
  }

  if (request.method === "POST" && pathname === "/criar-projeto") {
    const rewriteResponse = NextResponse.rewrite(new URL("/api/projetos/criar", request.url));
    const durationMs = timer.end({ authenticated: Boolean(user), outcome: "rewrite" });
    rewriteResponse.headers.set("Server-Timing", `pg-proxy;dur=${durationMs.toFixed(1)}`);
    return rewriteResponse;
  }

  const durationMs = timer.end({ authenticated: Boolean(user), outcome: "next" });
  response.headers.set("Server-Timing", `pg-proxy;dur=${durationMs.toFixed(1)}`);
  return response;
}

export const config = {
  matcher: [
    "/_next/image",
    // Executa autenticação somente onde há redirecionamento de acesso protegido.
    "/garagem/:path*",
    "/criar-projeto",
    "/carros/novo",
    "/carros/:slug/editar",
    "/projeto/:slug/editar",
    "/onboarding/:path*",
  ],
};
