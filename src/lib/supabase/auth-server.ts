import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { normalizeSlug } from "@/lib/garage/constants";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type ServerSupabaseClient = SupabaseClient<Database>;

export async function requireSupabaseUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: "Supabase nao configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, error: "Entre para continuar." };
  return { supabase, user, error: null };
}

function usernameFromUser(user: User) {
  const emailName = user.email?.split("@")[0] ?? "membro";
  return normalizeSlug(`${emailName}-${user.id.slice(0, 6)}`).slice(0, 24);
}

export async function ensureUserProfile(supabase: ServerSupabaseClient, user: User) {
  const selectColumns =
    "id, username, display_name, avatar_url, bio, city, state, instagram_handle, is_saves_public, cars_count, followers_count, following_count, created_at, updated_at";

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select(selectColumns)
    .eq("id", user.id)
    .maybeSingle();

  if (readError) return { ok: false, message: readError.message };
  if (profile) return { ok: true, message: null };

  const displayName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "Membro Projeto Garagem";
  const avatarUrl = typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      username: usernameFromUser(user),
      display_name: displayName,
      avatar_url: avatarUrl,
    })
    .select(selectColumns)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  return data ? { ok: true, message: null } : { ok: false, message: "Nao foi possivel preparar seu perfil." };
}
