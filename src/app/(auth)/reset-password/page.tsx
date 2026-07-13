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
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas nao coincidem.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase nao configurado.");
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
              {error ? <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
              <label className="grid gap-2 text-sm font-medium text-foreground/85">
                Nova senha
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground/85">
                Confirmar senha
                <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repita a nova senha" autoComplete="new-password" required />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </form>
    </AuthShell>
  );
}
