import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { normalizeSlug } from "@/lib/garage/constants";
import { getSafeNextPath } from "@/lib/auth/redirect";
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

export async function GET(request: NextRequest) {
  const origin = getRequestSiteUrl(request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeNextPath(request.nextUrl.searchParams.get("next"));

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, origin));
  }

  let response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Keep cookies available for downstream handlers/pages in this navigation.
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
          return NextResponse.redirect(new URL("/onboarding", origin));
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
