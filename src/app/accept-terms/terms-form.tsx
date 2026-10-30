"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TermsCheckbox } from "@/components/auth/terms-checkbox";
import { useAuth } from "@/components/AuthProvider";
import { TERMS_REQUIRED_MESSAGE, TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth/legal";

export function AcceptTermsForm({ next }: { next: string }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const { signOut } = useAuth();
  return <form className="grid gap-4" onSubmit={async (event) => {
    event.preventDefault();
    if (lock.current) return;
    if (!accepted) { setError(TERMS_REQUIRED_MESSAGE); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/terms", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION }) });
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent(`/accept-terms?next=${encodeURIComponent(next)}`)}`); return; }
      if (!response.ok) { setError((await response.json()).message ?? "Não foi possível registrar o aceite."); return; }
      window.location.assign(next);
    } catch { setError("Não foi possível registrar o aceite. Tente novamente."); }
    finally { lock.current = false; setBusy(false); }
  }}>
    <TermsCheckbox checked={accepted} onChange={(value) => { setAccepted(value); if (value && error === TERMS_REQUIRED_MESSAGE) setError(""); }} invalid={Boolean(error) && !accepted} />
    {error ? <p id="terms-error" role="alert" className="text-sm text-danger">{error}</p> : null}
    <Button disabled={busy} type="submit">{busy ? "Registrando..." : "Aceitar e continuar"}</Button>
    <Button disabled={busy} type="button" variant="ghost" onClick={async () => { setBusy(true); try { await signOut(); window.location.assign("/login"); } catch { setError("Não foi possível sair. Tente novamente."); setBusy(false); } }}>Sair da conta</Button>
    <Link href="/explorar" className="text-center text-xs text-muted underline">Continuar explorando</Link>
  </form>;
}
