"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function useSupabaseUser() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(() => Boolean(supabase));

  React.useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data.user ?? null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, configured: isSupabaseConfigured };
}
