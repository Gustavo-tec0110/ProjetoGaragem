"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg rounded-4xl border border-border/70 bg-card/80 p-8 text-center shadow-elevated md:p-10">
        <p className="text-sm text-muted">Erro inesperado</p>
        <h1 className="mt-2 font-title text-3xl tracking-tight md:text-4xl">
          Nao conseguimos carregar esta area
        </h1>
        <p className="mt-3 text-muted">
          Tente novamente. Se continuar acontecendo, volte para explorar os projetos.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-muted">Codigo: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => unstable_retry()}>
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <Link href="/explorar">Ir para explorar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
