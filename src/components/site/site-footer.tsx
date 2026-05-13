import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hidden md:block px-4 sm:px-6 pb-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mt-4 rounded-4xl pg-glass px-6 py-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="font-title tracking-tight">ProjetoGaragem</p>
              <p className="mt-1 text-sm text-muted max-w-md">
                Plataforma automotiva premium para montar builds compatíveis, salvar e
                compartilhar — com monetização via afiliados (em breve).
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-ui font-semibold">
              <Link className="text-muted hover:text-foreground" href="/explorar">
                Explorar
              </Link>
              <Link className="text-muted hover:text-foreground" href="/kits">
                Kits
              </Link>
              <Link className="text-muted hover:text-foreground" href="/comunidade">
                Comunidade
              </Link>
              <Link className="text-muted hover:text-foreground" href="/montar">
                Montar Projeto
              </Link>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-border/70" />
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted">
            <span>© {new Date().getFullYear()} ProjetoGaragem. Prototype UI.</span>
            <span>Next.js • Tailwind • Motion • Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
