"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront, Home, Package, Search, Users, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSupabaseUser } from "@/lib/supabase/use-user";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/explorar", label: "Explorar" },
  { href: "/projetos", label: "Projetos" },
  { href: "/kits", label: "Kits" },
  { href: "/comunidade", label: "Comunidade" },
] as const;

const bottomNav = [
  { href: "/", label: "Início", icon: Home },
  { href: "/explorar", label: "Explorar", icon: Search },
  { href: "/montar", label: "Montar", icon: Wrench },
  { href: "/kits", label: "Kits", icon: Package },
  { href: "/comunidade", label: "Feed", icon: Users },
] as const;

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-ui font-semibold transition-colors",
        active ? "text-foreground" : "text-muted hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

export function SiteNavbar() {
  const pathname = usePathname();
  const { user } = useSupabaseUser();
  const isActive = React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mt-3 rounded-4xl pg-glass">
              <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                <Link href="/" className="flex items-center gap-2">
                  <span className="inline-flex size-10 items-center justify-center rounded-3xl bg-accent/10 border border-accent/25 shadow-glow">
                    <CarFront className="size-5 text-accent" />
                  </span>
                  <div className="leading-tight">
                    <p className="font-title tracking-tight">ProjetoGaragem</p>
                    <p className="text-[11px] text-muted">Builds • Kits • Comunidade</p>
                  </div>
                </Link>

                <nav className="hidden md:flex items-center gap-5">
                  {nav.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={isActive(item.href)}
                    />
                  ))}
                </nav>

                <div className="hidden md:flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={user ? "/perfil" : "/login"}>{user ? "Perfil" : "Login"}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/montar">Montar Projeto</Link>
                  </Button>
                </div>

                <div className="md:hidden flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={user ? "/perfil" : "/login"}>{user ? "Perfil" : "Login"}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-4xl pg-glass">
            <div className="grid grid-cols-5 gap-1 p-2">
              {bottomNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group rounded-3xl px-2 py-2 flex flex-col items-center justify-center gap-1 transition active:scale-[0.99]",
                      active
                        ? "bg-accent/10 border border-accent/25 shadow-glow"
                        : "text-muted hover:text-foreground hover:bg-background/35"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-3xl border transition-colors",
                        active
                          ? "border-accent/25 bg-accent/10 text-accent"
                          : "border-border/70 bg-background/20 text-muted group-hover:text-foreground"
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[11px] font-ui font-semibold tracking-tight">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full transition",
                        active ? "bg-accent shadow-glow" : "bg-transparent"
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

