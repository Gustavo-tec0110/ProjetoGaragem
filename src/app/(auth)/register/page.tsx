"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-md pt-20 md:pt-24 pb-12">
          <Card className="p-6 md:p-8">
            <h1 className="font-title text-2xl tracking-tight">Criar conta</h1>
            {success ? (
              <p className="mt-4 text-sm text-muted">
                Cadastro iniciado. Se o Supabase exigir confirmacao, verifique seu email.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <Input placeholder="Nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                <Input placeholder="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <Input placeholder="Confirmar senha" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Cadastrando..." : "Criar conta"}
                </Button>
              </form>
            )}
            <p className="mt-3 text-xs text-muted">
              <Link href="/login" className="underline">Ja tem conta? Entrar</Link>
            </p>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
