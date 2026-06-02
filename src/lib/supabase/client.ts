import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (client) return client;

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export const getSession = async (): Promise<Session | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
};

export const getUser = async (): Promise<User | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
};
