"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSiteUrl } from "@/lib/supabase/env";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Recuperacao indisponivel enquanto o Supabase nao estiver configurado.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError("Nao foi possivel enviar o link agora.");
    } else {
      setSent(true);
    }

    setLoading(false);
  }

  return (
    <AuthShell
      eyebrow="Recuperação de acesso"
      title="Recupere sua senha"
      description="Informe seu email e enviaremos as instruções para voltar à sua garagem."
    >
        {sent ? (
          <div className="rounded-xl border border-success/25 bg-success/10 p-4 text-sm text-foreground/85" role="status">
            Se o email estiver cadastrado, você receberá um link de redefinição.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
            <label className="grid gap-2 text-sm font-medium text-foreground/85">
              Email
              <Input
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}

        <Button asChild variant="ghost" className="mt-4 w-full">
          <Link href="/login">Voltar ao login</Link>
        </Button>
    </AuthShell>
  );
}
