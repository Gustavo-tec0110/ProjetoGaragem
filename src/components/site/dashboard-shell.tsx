"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Bell, Menu, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const topNav = [
  { href: "/", label: "Início" },
  { href: "/kits", label: "Kits" },
  { href: "/montar", label: "Monte o seu" },
  { href: "/explorar", label: "Peças" },
  { href: "/projetos", label: "Oficinas" },
  { href: "/explorar", label: "Blog" },
  { href: "/comunidade", label: "Comunidade" },
] as const;

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function SidebarContent({ items }: { items: SidebarItem[] }) {
  return (
    <aside className="h-full flex flex-col gap-4">
      <div className="px-5 pt-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="font-title text-2xl tracking-tight">
            Projeto<span className="text-accent">Garagem</span>
          </span>
        </Link>
      </div>

      <nav className="px-4 flex-1">
        <div className="rounded-3xl border border-border/70 bg-background-2/60 p-2">
          {items.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-ui font-semibold transition-colors",
                item.href === "/"
                  ? "bg-accent/15 text-foreground border border-accent/25 shadow-glow"
                  : "text-muted hover:text-foreground hover:bg-background/35"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-2xl border border-border/70 bg-background/30 transition-colors",
                  item.href === "/" && "border-accent/25 bg-accent/10"
                )}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border border-border/70 bg-background-2/60 p-4">
          <p className="text-xs text-muted font-ui font-semibold">BAIXE NOSSO APP</p>
          <p className="mt-2 text-sm text-muted">
            Monte projetos, salve ideias e receba ofertas exclusivas.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-2xl border border-border/70 bg-background/35 px-3 py-2 text-xs font-ui font-semibold text-foreground hover:bg-background/55 transition-colors"
            >
              Google Play
            </button>
            <button
              type="button"
              className="rounded-2xl border border-border/70 bg-background/35 px-3 py-2 text-xs font-ui font-semibold text-foreground hover:bg-background/55 transition-colors"
            >
              App Store
            </button>
          </div>
        </div>
      </nav>
    </aside>
  );
}

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg:hidden inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <nav className="hidden lg:flex items-center gap-6">
          {topNav.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="text-sm font-ui font-semibold text-muted hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground hover:bg-background/55 transition-colors"
          aria-label="Buscar"
        >
          <Search className="size-5" />
        </button>

        <button
          type="button"
          className="relative inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground hover:bg-background/55 transition-colors"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          <span className="absolute -top-1 -right-1 grid place-items-center size-5 rounded-full bg-accent text-[10px] font-ui font-bold text-foreground shadow-glow">
            2
          </span>
        </button>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground"
          aria-label="Perfil"
        >
          <span className="size-7 rounded-full bg-gradient-to-br from-accent/60 to-accent-2/60" />
        </button>
      </div>
    </div>
  );
}

export function DashboardShell({
  sidebarItems,
  left,
  right,
}: {
  sidebarItems: SidebarItem[];
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="pointer-events-none absolute inset-0 pg-grid-bg opacity-60" />
      <div className="mx-auto w-full max-w-[1500px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[280px_1fr]">
          <div className="hidden lg:block">
            <div className="sticky top-6 h-[calc(100vh-48px)] rounded-4xl border border-border/70 bg-background/30 overflow-hidden">
              <SidebarContent items={sidebarItems} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="rounded-4xl border border-border/70 bg-background/30 px-4 py-3 md:px-5 md:py-4">
              <Topbar onOpenMenu={() => setMobileMenuOpen(true)} />
            </div>

            <div className="mt-4 lg:mt-6 grid gap-4 lg:gap-6 lg:grid-cols-[1.65fr_1fr]">
              <div className="min-w-0">{left}</div>
              <div className="min-w-0">{right}</div>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden" />
          <Dialog.Content className="fixed inset-y-4 left-4 right-4 rounded-4xl border border-border/70 bg-background-2/85 p-4 overflow-auto lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="font-title text-xl tracking-tight">
                Projeto<span className="text-accent">Garagem</span>
              </p>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-4">
              <SidebarContent items={sidebarItems} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
