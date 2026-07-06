"use client";

import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background px-6 py-16 text-foreground antialiased">
        <main className="grid min-h-[calc(100vh-8rem)] place-items-center">
          <div className="w-full max-w-lg rounded-4xl border border-border/70 bg-card/80 p-8 text-center shadow-elevated md:p-10">
            <p className="text-sm text-muted">Projeto Garagem</p>
            <h1 className="mt-2 font-title text-3xl tracking-tight md:text-4xl">
              Algo saiu do ponto
            </h1>
            <p className="mt-3 text-muted">
              A pagina encontrou um erro inesperado. Recarregue a experiencia para continuar.
            </p>
            {error.digest ? (
              <p className="mt-3 text-xs text-muted">Codigo: {error.digest}</p>
            ) : null}
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-3xl bg-accent px-6 font-ui text-sm font-semibold text-foreground shadow-glow transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
