import type { User } from "@supabase/supabase-js";

function userMetadataString(user: User, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getAuthUserName(user: User | null) {
  if (!user) return null;

  return (
    userMetadataString(user, "full_name") ??
    userMetadataString(user, "name") ??
    user.email ??
    "Membro Projeto Garagem"
  );
}

export function getAuthUserAvatar(user: User | null) {
  if (!user) return null;

  return (
    userMetadataString(user, "avatar_url") ??
    userMetadataString(user, "picture")
  );
}
