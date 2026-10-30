"use client";

import * as React from "react";
import type { AuthError, User } from "@supabase/supabase-js";

import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import { requireCaptchaToken } from "@/lib/auth/captcha";
import { getGoogleNextPath } from "@/lib/auth/redirect";

async function getSupabaseBrowserClient() {
  const browserModule = await import("@/lib/supabase/browser");
  return browserModule.getSupabaseBrowserClient();
}

function hasSupabaseAuthCookie() {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithEmail: (email: string, password: string, captchaToken?: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (nextPath?: string | null) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null; hasSession: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    // GoTrue falls back to site_url when state validation fails before it can
    // recover redirectTo. Do not present that return as a successful login or
    // copy the provider's description/query into the error page.
    const query = new URLSearchParams(window.location.search);
    if (window.location.pathname === "/" && query.get("error") && query.get("error_code")) {
      window.location.replace("/auth/auth-code-error");
      return;
    }

    if (!isSupabaseConfigured || !hasSupabaseAuthCookie()) {
      return;
    }

    void (async () => {
      const supabase = await getSupabaseBrowserClient();
      if (!supabase || !mounted) return;
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      // Este estado controla apenas a UI. O servidor e a RLS continuam
      // validando getUser() antes de qualquer leitura ou mutação sensível.
      setUser(sessionData.session?.user ?? null);

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    })()
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const signInWithEmail = React.useCallback(async (email: string, password: string, captchaToken?: string) => {
    const supabase = await getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error("Supabase nao configurado") as AuthError };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: requireCaptchaToken(captchaToken) } });
    if (!error) setUser(data.user);
    return { error };
  }, []);

  const signInWithGoogle = React.useCallback(async (nextPath?: string | null) => {
    const supabase = await getSupabaseBrowserClient();
    if (!supabase) {
      return { error: new Error("Supabase nao configurado") as AuthError };
    }

    const next = getGoogleNextPath(nextPath, window.location.pathname, window.location.search);
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
    async (email: string, password: string, fullName?: string, captchaToken?: string) => {
      const supabase = await getSupabaseBrowserClient();
      if (!supabase) {
        return { error: new Error("Supabase nao configurado") as AuthError, hasSession: false };
      }

      const emailRedirectTo = new URL("/auth/callback", getSiteUrl());
      emailRedirectTo.searchParams.set("next", "/onboarding");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirectTo.toString(),
          captchaToken: requireCaptchaToken(captchaToken),
          data: {
            full_name: fullName,
          },
        },
      });

      if (!error && data.session) setUser(data.user);

      return { error, hasSession: Boolean(data.session) };
    },
    []
  );

  const signOut = React.useCallback(async () => {
    const supabase = await getSupabaseBrowserClient();
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
