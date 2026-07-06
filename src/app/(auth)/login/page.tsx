"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

function safeNextPath(next: string | null) {
  if (!next) return "/garagem";
  if (!next.startsWith("/")) return "/garagem";
  if (next.startsWith("//")) return "/garagem";
  return next;
}

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
    router.push(safeNextPath(nextPath));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-md pt-20 md:pt-24 pb-12">
          <Card className="p-6 md:p-8">
            <h1 className="font-title text-2xl tracking-tight">Entrar no Projeto Garagem</h1>
            <p className="mt-2 text-sm text-muted">
              Entre para criar, curtir, salvar e comentar projetos.
            </p>

            <div className="mt-6">
              <GoogleSigninButton />
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <Input placeholder="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <p className="mt-3 text-xs text-muted">
              <Link href="/forgot-password" className="underline">Esqueci minha senha</Link>
              <span className="mx-2">-</span>
              <Link href="/register" className="underline">Criar conta</Link>
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <Button asChild variant="outline">
                <Link href="/explorar">Continuar explorando</Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
