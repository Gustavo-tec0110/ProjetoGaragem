"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto mt-10 max-w-md px-4">
      <Card className="p-6">
        <h1 className="font-title text-2xl tracking-tight">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted">
          Enviamos um link de redefinicao se o email existir.
        </p>

        {sent ? (
          <p className="mt-4 text-sm text-muted">
            Se o email existir, voce recebera um link de redefinicao.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}

        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </Card>
    </div>
  );
}
