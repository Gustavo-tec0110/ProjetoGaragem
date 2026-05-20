"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export function OAuthCallback({ code }: { code: string | null }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!supabase || !code) return;

    let mounted = true;
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!mounted) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("ok");
      setMessage(null);
      router.replace("/perfil");
    });

    return () => {
      mounted = false;
    };
  }, [code, router]);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <Card className="p-6 md:p-8">
        <p className="text-xs text-muted">Autenticação</p>
        <h1 className="mt-2 font-title text-2xl tracking-tight">Callback</h1>
        <div className="mt-5 rounded-3xl border border-danger/30 bg-danger/10 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 text-danger" />
            <div className="min-w-0">
              <p className="font-ui font-semibold tracking-tight">Supabase não configurado</p>
              <p className="mt-1 text-sm text-muted break-words">
                Configure NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY em <span className="text-foreground font-semibold">.env.local</span>.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="sm:flex-1">
            <Link href="/login">Voltar ao login</Link>
          </Button>
          <Button asChild className="sm:flex-1">
            <Link href="/montar">Continuar</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (!code) {
    return (
      <Card className="p-6 md:p-8">
        <p className="text-xs text-muted">Autenticação</p>
        <h1 className="mt-2 font-title text-2xl tracking-tight">Callback inválido</h1>
        <div className="mt-5 rounded-3xl border border-danger/30 bg-danger/10 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 text-danger" />
            <div className="min-w-0">
              <p className="font-ui font-semibold tracking-tight">Sem parâmetro</p>
              <p className="mt-1 text-sm text-muted break-words">
                Callback sem parâmetro <span className="text-foreground font-semibold">code</span>.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="sm:flex-1">
            <Link href="/login">Voltar ao login</Link>
          </Button>
          <Button asChild className="sm:flex-1">
            <Link href="/montar">Continuar</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8">
      <p className="text-xs text-muted">Autenticação</p>
      <h1 className="mt-2 font-title text-2xl tracking-tight">Finalizando login</h1>
      <p className="mt-2 text-sm text-muted">
        {status === "loading"
          ? "Trocando código por sessão..."
          : status === "ok"
            ? "Sessão criada. Redirecionando..."
            : "Falha ao autenticar."}
      </p>

      {status === "error" ? (
        <div className="mt-5 rounded-3xl border border-danger/30 bg-danger/10 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-5 text-danger" />
            <div className="min-w-0">
              <p className="font-ui font-semibold tracking-tight">Erro</p>
              <p className="mt-1 text-sm text-muted break-words">{message}</p>
            </div>
          </div>
        </div>
      ) : status === "ok" ? (
        <div className="mt-5 rounded-3xl border border-success/30 bg-success/10 p-4">
          <div className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 size-5 text-success" />
            <div className="min-w-0">
              <p className="font-ui font-semibold tracking-tight">Sucesso</p>
              <p className="mt-1 text-sm text-muted">Você já pode acessar seu perfil.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <Button asChild variant="outline" className="sm:flex-1">
          <Link href="/login">Voltar ao login</Link>
        </Button>
        <Button asChild className="sm:flex-1">
          <Link href="/perfil">Abrir perfil</Link>
        </Button>
      </div>
    </Card>
  );
}
