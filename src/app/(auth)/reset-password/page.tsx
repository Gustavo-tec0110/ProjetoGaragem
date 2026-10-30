"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<"password" | "confirm" | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInvalidField(null);
    // The existing registration policy requires at least six characters.
    if (password.length < 6) {
      setError("A nova senha deve ter ao menos 6 caracteres.");
      setInvalidField("password");
      document.getElementById("new-password")?.focus();
      return;
    }
    if (password !== confirm) {
      setError("A confirmação deve ser igual à nova senha.");
      setInvalidField("confirm");
      document.getElementById("confirm-password")?.focus();
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("A redefinição de senha está temporariamente indisponível. Tente novamente mais tarde.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/login");
  }

  return (
    <AuthShell
      eyebrow="Segurança da conta"
      title="Defina uma nova senha"
      description="Escolha uma senha segura para voltar aos seus projetos."
    >
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? <p id="reset-password-error" role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
              <label className="grid gap-2 text-sm font-medium text-foreground/85">
                Nova senha
                <Input id="new-password" minLength={6} aria-invalid={invalidField === "password"} aria-describedby={invalidField === "password" ? "reset-password-error" : "password-hint"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground/85">
                Confirmar senha
                <Input id="confirm-password" minLength={6} aria-invalid={invalidField === "confirm"} aria-describedby={invalidField === "confirm" ? "reset-password-error" : "password-hint"} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repita a nova senha" autoComplete="new-password" required />
              </label>
              <p id="password-hint" className="text-xs text-muted">Use ao menos 6 caracteres e repita a mesma senha na confirmação.</p>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </form>
    </AuthShell>
  );
}
