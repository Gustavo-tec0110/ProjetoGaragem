import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  getRequestSiteUrl,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";

function safeNextPath(next: string | null) {
  if (!next) return "/garagem";
  if (!next.startsWith("/")) return "/garagem";
  if (next.startsWith("//")) return "/garagem";
  return next;
}

export async function GET(request: NextRequest) {
  const origin = getRequestSiteUrl(request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, origin));
  }

  let response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Mantém cookies disponíveis para handlers/pages downstream nesta mesma navegação
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.redirect(new URL(next, origin));
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  if (!code) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, origin));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", origin));
  }

  // Redireciona para onboarding se o perfil ainda não existe
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.redirect(new URL("/onboarding", origin));
    }
  }

  return response;
}
