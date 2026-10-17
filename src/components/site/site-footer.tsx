"use client";

import Link from "next/link";
import { CarFront } from "lucide-react";
import { usePathname } from "next/navigation";

import { CookiePreferencesTrigger } from "@/components/privacy/cookie-consent";

export function SiteFooter() {
  const pathname = usePathname();
  if (["/login", "/register", "/forgot-password", "/reset-password", "/onboarding"].some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <footer className="mt-auto px-4 pb-[calc(var(--mobile-bottom-nav-space)+1.25rem)] pt-6 sm:px-6 lg:pb-10 lg:pt-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-t border-border/60 px-1 pt-7">
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-x-8">
            <div className="col-span-2 min-w-0 sm:col-span-1 lg:pr-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                  <CarFront aria-hidden="true" className="size-5" />
                </span>
                <p className="font-title text-lg tracking-tight">Projeto Garagem</p>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
                O lugar para documentar cada fase e descobrir projetos que inspiram a próxima volta.
              </p>
            </div>
            <nav aria-label="Navegação do rodapé" className="min-w-0">
              <h2 className="font-ui text-xs font-semibold uppercase tracking-widest text-foreground">Navegação</h2>
              <ul className="mt-3 space-y-1 text-sm text-muted [&_a]:inline-flex [&_a]:min-h-9 [&_a]:items-center [&_a]:rounded-sm [&_a]:transition-colors [&_a:hover]:text-accent">
                <li><Link href="/explorar">Explorar</Link></li>
                <li><Link href="/atualizacoes">Atualizações</Link></li>
                <li><Link href="/rankings">Rankings</Link></li>
              </ul>
            </nav>
            <nav aria-label="Plataforma e informações legais" className="min-w-0">
              <h2 className="font-ui text-xs font-semibold uppercase tracking-widest text-foreground">Plataforma</h2>
              <ul className="mt-3 space-y-1 text-sm text-muted [&_a]:inline-flex [&_a]:min-h-9 [&_a]:items-center [&_a]:rounded-sm [&_a]:transition-colors [&_a:hover]:text-accent [&_button]:min-h-9 [&_button]:rounded-sm [&_button:hover]:text-accent">
                <li><Link href="/garagem">Minha Garagem</Link></li>
                <li><Link href="/criar-projeto">Adicionar projeto</Link></li>
                <li><Link href="/privacy">Privacidade</Link></li>
                <li><Link href="/terms">Termos</Link></li>
                <li><CookiePreferencesTrigger /></li>
              </ul>
            </nav>
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <h2 className="font-ui text-xs font-semibold uppercase tracking-widest text-foreground">Contato</h2>
              <p className="mt-3 text-sm leading-6 text-muted">Fale com o Projeto Garagem.</p>
              <a className="mt-1 inline-flex min-h-9 max-w-full items-center rounded-sm text-sm text-foreground underline decoration-accent/60 underline-offset-4 transition-colors [overflow-wrap:anywhere] hover:text-accent" href="mailto:gustavo.sl.0110@gmail.com">
                gustavo.sl.0110@gmail.com
              </a>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-border/50" />
          <div className="mt-4 flex flex-col gap-2 text-xs leading-5 text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Projeto Garagem.</span>
            <span>Feito para quem vive projeto automotivo.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
