import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './env';
import type { Database } from "@/types/supabase";

let publicClient: SupabaseClient<Database> | null = null;

export function getSupabasePublicClient() {
  if (!isSupabaseConfigured) return null;
  if (publicClient) return publicClient;

  publicClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return publicClient;
}

export const getSupabaseServerClient = cache(async function getSupabaseServerClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options });
          }
        } catch {
          // Server Components não podem setar cookies. O `proxy.ts` cuida do refresh.
        }
      },
    },
  });
});
