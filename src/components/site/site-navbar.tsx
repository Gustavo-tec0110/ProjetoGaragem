"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { CarFront, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/explorar", label: "Explorar" },
  { href: "/projetos", label: "Projetos" },
  { href: "/kits", label: "Kits" },
  { href: "/comunidade", label: "Comunidade" },
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
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
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
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/montar">Montar Projeto</Link>
                </Button>
              </div>

              <div className="md:hidden">
                <MobileMenu activePath={pathname} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ activePath }: { activePath: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-4 top-6 rounded-4xl pg-glass p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-3xl bg-accent/10 border border-accent/25 shadow-glow">
                <CarFront className="size-5 text-accent" />
              </span>
              <div className="leading-tight">
                <p className="font-title tracking-tight">ProjetoGaragem</p>
                <p className="text-[11px] text-muted">Menu</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 grid gap-3">
            {nav.map((item) => {
              const active =
                activePath === item.href || activePath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-3xl border px-4 py-3 font-ui font-semibold transition-colors",
                    active
                      ? "border-accent/45 bg-accent/10 shadow-glow"
                      : "border-border/70 bg-background/35 text-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2">
            <Button asChild variant="outline" onClick={() => setOpen(false)}>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/montar">Montar Projeto</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
