import "server-only";

import type { ServerSupabaseClient } from "@/lib/supabase/auth-server";

export type RateLimitAction =
  | "comment_create"
  | "comment_delete"
  | "notification_read"
  | "profile_write"
  | "project_create"
  | "project_update"
  | "social_toggle"
  | "upload_image";

export async function enforceActionRateLimit(
  supabase: ServerSupabaseClient,
  action: RateLimitAction
) {
  const rateLimitClient = supabase as unknown as {
    rpc: (name: string, args: Record<string, string>) => Promise<{ data: boolean | null; error: unknown }>;
  };
  const { data, error } = await rateLimitClient.rpc("enforce_action_rate_limit", {
    p_action: action,
  });

  // Escritas falham de modo seguro se a proteção transacional não estiver disponível.
  if (error || data !== true) {
    return {
      ok: false,
      message: error
        ? "Não foi possível confirmar o limite de segurança. Tente novamente em instantes."
        : "Muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.",
    } as const;
  }

  return { ok: true } as const;
}
