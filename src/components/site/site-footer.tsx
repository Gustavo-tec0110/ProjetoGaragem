import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="hidden px-4 pb-10 sm:px-6 lg:block">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mt-8 border-t border-border/60 px-1 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-title text-lg tracking-tight">Projeto Garagem</p>
              <p className="mt-1 max-w-md text-sm text-muted">
                O lugar para documentar cada fase e descobrir projetos que inspiram a próxima volta.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-ui font-semibold">
              <Link className="text-muted hover:text-foreground" href="/explorar">
                Explorar
              </Link>
              <Link className="text-muted hover:text-foreground" href="/atualizacoes">
                Atualizações
              </Link>
              <Link className="text-muted hover:text-foreground" href="/rankings">
                Rankings
              </Link>
              <Link className="text-muted hover:text-foreground" href="/garagem">
                Minha Garagem
              </Link>
              <Link className="text-muted hover:text-foreground" href="/criar-projeto">
                Adicionar projeto
              </Link>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-border/50" />
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>{new Date().getFullYear()} Projeto Garagem.</span>
            <span>Feito para quem vive projeto automotivo.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
