"use client";

import * as React from "react";
import type { AuthError, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import { getSafeNextPath } from "@/lib/auth/redirect";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (nextPath?: string | null) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(() => isSupabaseConfigured);

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let mounted = true;

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      let currentUser = sessionData.session?.user ?? null;

      if (sessionData.session) {
        const { data: userData } = await supabase.auth.getUser();
        currentUser = userData.user ?? currentUser;
      }

      if (!mounted) return;
      setUser(currentUser);
    })()
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = React.useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error("Supabase nao configurado") as AuthError };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signInWithGoogle = React.useCallback(async (nextPath?: string | null) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error("Supabase nao configurado") as AuthError };
    }

    const queryNext =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    const next = getSafeNextPath(nextPath ?? queryNext);
    const redirectUrl = new URL("/auth/callback", getSiteUrl());
    redirectUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl.toString(),
      },
    });

    return { error };
  }, []);

  const signUpWithEmail = React.useCallback(
    async (email: string, password: string, fullName?: string) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return { error: new Error("Supabase nao configurado") as AuthError };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      return { error };
    },
    []
  );

  const signOut = React.useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: isSupabaseConfigured,
      signInWithEmail,
      signInWithGoogle,
      signUpWithEmail,
      signOut,
    }),
    [loading, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
