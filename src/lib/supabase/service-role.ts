import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

/**
 * Cliente privilegiado exclusivo do servidor. A identidade do usuário deve
 * sempre ser validada com o cliente de sessão antes de usar este cliente.
 */
export function getSupabaseServiceRoleClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
