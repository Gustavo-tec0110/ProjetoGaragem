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
          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="flex gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent"><CarFront className="size-5" /></span>
              <div>
                <p className="font-title text-lg tracking-tight">Projeto Garagem</p>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted">
                O lugar para documentar cada fase e descobrir projetos que inspiram a próxima volta.
              </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-7 gap-y-3 text-sm font-ui font-semibold sm:flex sm:flex-wrap sm:justify-end">
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
              <Link className="text-muted hover:text-foreground" href="/privacy">
                Privacidade
              </Link>
              <Link className="text-muted hover:text-foreground" href="/terms">
                Termos
              </Link>
              <CookiePreferencesTrigger />
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
