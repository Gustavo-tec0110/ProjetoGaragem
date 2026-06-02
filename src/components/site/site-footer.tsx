import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hidden md:block px-4 sm:px-6 pb-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mt-4 rounded-4xl pg-glass px-6 py-6 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-title tracking-tight">Projeto Garagem</p>
              <p className="mt-1 max-w-md text-sm text-muted">
                Catalogo social de carros, pecas, fotos e projetos reais.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-ui font-semibold">
              <Link className="text-muted hover:text-foreground" href="/explorar">
                Explorar
              </Link>
              <Link className="text-muted hover:text-foreground" href="/rankings">
                Rankings
              </Link>
              <Link className="text-muted hover:text-foreground" href="/garagem">
                Minha Garagem
              </Link>
              <Link className="text-muted hover:text-foreground" href="/carros/novo">
                Adicionar carro
              </Link>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-border/70" />
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>{new Date().getFullYear()} Projeto Garagem.</span>
            <span>Next.js - Tailwind - Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
