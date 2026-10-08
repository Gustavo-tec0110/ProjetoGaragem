"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
      <path fill="#4285F4" d="M21.35 12.23c0-.74-.07-1.45-.21-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.29Z" />
      <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.6Z" />
      <path fill="#FBBC05" d="M6.54 13.69A5.85 5.85 0 0 1 6.23 12c0-.59.11-1.17.31-1.69V7.78H3.3A9.72 9.72 0 0 0 2.27 12c0 1.57.38 3.05 1.03 4.22l3.24-2.53Z" />
      <path fill="#EA4335" d="M12 6.28c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.36 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.7 5.38l3.24 2.53C7.31 8 9.46 6.28 12 6.28Z" />
    </svg>
  );
}

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
        className="h-14 w-full border-foreground/15 bg-white/[0.04] text-[0.95rem] shadow-soft hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-white/[0.08]"
        disabled={busy}
        aria-busy={busy}
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
        {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <GoogleMark />}
        <span>{busy ? "Abrindo o Google…" : "Continuar com Google"}</span>
      </Button>
      {error ? <p role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs leading-5 text-danger">{error}</p> : null}
    </div>
  );
}
