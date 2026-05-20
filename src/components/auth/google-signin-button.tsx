"use client";

import * as React from "react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function GoogleSigninButton() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="rounded-3xl border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
        Para ativar Login Google, configure <span className="text-foreground font-semibold">Supabase</span> em{" "}
        <span className="text-foreground font-semibold">.env.local</span> (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          if (!supabase) return;
          setError(null);
          setBusy(true);
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            setError(error.message);
            setBusy(false);
            return;
          }
        }}
      >
        <LogIn className="size-4" />
        {busy ? "Abrindo Google..." : "Continuar com Google"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
