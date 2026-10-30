import { hasCurrentTerms, termsDestination } from "@/lib/auth/terms-server";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { normalizeSlug } from "@/lib/garage/constants";
import { authCallbackRedirectUrl, getPostTermsPath } from "@/lib/auth/redirect";
import { getAuthUserAvatar, getAuthUserName } from "@/lib/auth/user";
import {
  getRequestSiteUrl,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import type { ProfileRow } from "@/lib/types";
import type { Database } from "@/types/supabase";

function metadataString(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function usernameFromUser(user: User) {
  const source =
    metadataString(user, "preferred_username") ||
    user.email?.split("@")[0] ||
    getAuthUserName(user) || "Membro Projeto Garagem";

  return normalizeSlug(`${source}-${user.id.slice(0, 6)}`).slice(0, 24);
}

function authRedirect(destination: string, origin: string) {
  const response = NextResponse.redirect(authCallbackRedirectUrl(destination, origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  const origin = getRequestSiteUrl(request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const next = getPostTermsPath(request.nextUrl.searchParams.get("next"));

  if (!isSupabaseConfigured) {
    return authRedirect(`/login?next=${encodeURIComponent(next)}`, origin);
  }

  let response = authRedirect(next, origin);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Keep cookies available for downstream handlers/pages in this navigation.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = authRedirect(next, origin);
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
    return authRedirect(`/login?next=${encodeURIComponent(next)}`, origin);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return authRedirect("/auth/auth-code-error", origin);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Recovery must not try profile writes, which RLS refuses before acceptance.
  if (user && new URL(next, origin).pathname === "/reset-password") return response;
  if (user && !await hasCurrentTerms(supabase)) {
    response.headers.set("Location", authCallbackRedirectUrl(termsDestination(next), origin).toString());
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const displayName = getAuthUserName(user) ?? "Membro Projeto Garagem";
      const fullName = metadataString(user, "full_name") || metadataString(user, "name");
      const avatarUrl = getAuthUserAvatar(user);
      const username = usernameFromUser(user);

      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        username,
        display_name: displayName,
        email: user.email ?? null,
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      if (insertError) {
        const { error: legacyInsertError } = await supabase.from("profiles").insert({
          id: user.id,
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
        });

        if (legacyInsertError) {
          return authRedirect("/onboarding", origin);
        }
      }
    } else {
      const fullName = metadataString(user, "full_name") || metadataString(user, "name");
      const avatarUrl = getAuthUserAvatar(user);
      const profileUpdate: Partial<Pick<ProfileRow, "email" | "full_name" | "avatar_url">> = {
        email: user.email ?? null,
      };

      if (fullName) {
        profileUpdate.full_name = fullName;
      }

      if (avatarUrl) {
        profileUpdate.avatar_url = avatarUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id);

      if (updateError && avatarUrl) {
        await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id);
      }
    }
  }

  return response;
}
