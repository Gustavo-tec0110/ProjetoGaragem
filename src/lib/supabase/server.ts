import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './env';
import type { Database } from "@/types/supabase";

export async function getSupabaseServerClient() {
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
}
