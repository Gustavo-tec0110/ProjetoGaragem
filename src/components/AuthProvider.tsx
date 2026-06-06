"use client";

import * as React from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/env";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
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

function safeNextPath(next: string | null) {
  if (!next) return "/garagem";
  if (!next.startsWith("/")) return "/garagem";
  if (next.startsWith("//")) return "/garagem";
  return next;
}

export function getAuthUserName(user: User | null) {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : null;
  const name = typeof metadata.name === "string" ? metadata.name : null;

  return fullName || name || user.email || "Membro Projeto Garagem";
}

export function getAuthUserAvatar(user: User | null) {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const avatar = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
  const picture = typeof metadata.picture === "string" ? metadata.picture : null;

  return avatar || picture;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
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
      setSession(sessionData.session);
      setUser(currentUser);
    })()
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
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
    const next = safeNextPath(nextPath ?? queryNext);
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

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const { error } = await signInWithEmail(email, password);
      return error;
    },
    [signInWithEmail]
  );

  const signOut = React.useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isLoading: loading,
      configured: isSupabaseConfigured,
      signIn,
      signInWithEmail,
      signInWithGoogle,
      signUpWithEmail,
      signOut,
    }),
    [loading, session, signIn, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, user]
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
