"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUpWithEmail(email, password, fullName);
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message ?? "Erro ao cadastrar.");
      return;
    }

    setSuccess(true);
    router.push("/onboarding");
  };

  return (
    <AuthShell
      eyebrow="Faça parte da comunidade"
      title="Crie sua conta"
      description="Publique projetos, salve referências e acompanhe a evolução da sua garagem."
    >
            {success ? (
              <p className="mt-4 text-sm text-muted">
                Cadastro iniciado. Se o Supabase exigir confirmacao, verifique seu email.
              </p>
            ) : (
              <>
                <GoogleSigninButton />

                <div className="my-5 flex items-center gap-3 text-[10px] font-ui font-semibold uppercase tracking-[0.18em] text-muted/80">
                  <span className="h-px flex-1 bg-border/70" />
                  <span>ou continue com email</span>
                  <span className="h-px flex-1 bg-border/70" />
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-foreground/85">
                    Nome completo
                    <Input placeholder="Como você quer ser chamado" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-foreground/85">
                    Email
                    <Input placeholder="voce@email.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-foreground/85">
                      Senha
                      <Input placeholder="Mínimo de 6 caracteres" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-foreground/85">
                      Confirmar senha
                      <Input placeholder="Repita a senha" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
                    </label>
                  </div>
                  {error ? <p role="alert" aria-live="polite" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Cadastrando..." : "Criar conta"}
                  </Button>
                </form>
              </>
            )}
            <p className="mt-5 text-center text-xs text-muted">
              Já tem uma conta? <Link href="/login" className="font-semibold text-foreground hover:text-accent">Entrar</Link>
            </p>
    </AuthShell>
  );
}
