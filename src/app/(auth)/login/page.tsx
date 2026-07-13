"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { getSafeNextPath } from "@/lib/auth/redirect";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await signInWithEmail(email, password);
    setLoading(false);

    if (signInError) {
      setError("Email ou senha incorretos.");
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.push(getSafeNextPath(nextPath));
  };

  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entre no Projeto Garagem"
      description="Acesse seus projetos, referências salvas e as novidades da comunidade."
    >
            <GoogleSigninButton />

            <div className="my-5 flex items-center gap-3 text-[10px] font-ui font-semibold uppercase tracking-[0.18em] text-muted">
              <span className="h-px flex-1 bg-border/70" />
              <span>ou use seu email</span>
              <span className="h-px flex-1 bg-border/70" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="grid gap-2 text-sm font-medium text-foreground/85">
                Email
                <Input placeholder="voce@email.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-foreground/85">
                Senha
                <Input placeholder="Sua senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
              </label>
              {error ? <p role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
              <Button type="submit" disabled={loading} className="mobile-cta-safe w-full">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-3 text-xs">
              <Link href="/forgot-password" className="text-muted underline-offset-4 hover:text-foreground hover:underline">Esqueci minha senha</Link>
              <Link href="/register" className="font-semibold text-foreground underline-offset-4 hover:text-accent">Criar conta</Link>
            </div>
            <Button asChild variant="ghost" className="mt-5 w-full">
              <Link href="/explorar">Continuar explorando</Link>
            </Button>
    </AuthShell>
  );
}
