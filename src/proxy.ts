import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  getRequestSiteUrl,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";
import { logPerformance, performanceTimer } from "@/lib/performance";

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
    const loginUrl = new URL("/login", getRequestSiteUrl(request.nextUrl.origin));
    loginUrl.searchParams.set("next", nextParam);
    const redirectResponse = NextResponse.redirect(loginUrl);
    const durationMs = timer.end({ authenticated: false, outcome: "redirect" });
    redirectResponse.headers.set("Server-Timing", `pg-proxy;dur=${durationMs.toFixed(1)}`);
    return redirectResponse;
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
    // Executa autenticação somente onde há redirecionamento de acesso protegido.
    "/garagem/:path*",
    "/criar-projeto",
    "/carros/novo",
    "/carros/:slug/editar",
    "/projeto/:slug/editar",
    "/onboarding/:path*",
  ],
};
