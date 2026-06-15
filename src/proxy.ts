import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  getRequestSiteUrl,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";

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
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request: { headers: request.headers } });
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", getRequestSiteUrl(request.nextUrl.origin));
    loginUrl.searchParams.set("next", nextParam);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Exclui rotas internas e arquivos estáticos (Next.js docs recommendation).
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
