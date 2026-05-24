"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
  });

  return browserClient;
}

