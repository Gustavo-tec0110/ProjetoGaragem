"use client";

import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  if (browserClient) return browserClient;

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions(),
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    isSingleton: true,
  });

  return browserClient;
}
