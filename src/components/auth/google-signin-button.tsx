"use client";

import * as React from "react";
import { LogIn } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

export function GoogleSigninButton({ nextPath }: { nextPath?: string | null }) {
  const { configured, signInWithGoogle } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!configured) {
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
          setError(null);
          setBusy(true);

          const currentPath =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : null;
          const { error } = await signInWithGoogle(nextPath ?? currentPath);

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
