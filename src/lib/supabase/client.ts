import { createClient, type Session, type User } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseUrl } from "./env";

const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "public-anon-key";

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey
);

export const getSession = async (): Promise<Session | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
};

export const getUser = async (): Promise<User | null> => {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
};
