"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CarFront, ChevronDown, Compass, Home, LogOut, Plus, Trophy, User, Warehouse } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { getAuthUserAvatar, getAuthUserName, useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/explorar", label: "Explorar" },
  { href: "/atualizacoes", label: "Atualizações" },
  { href: "/comparar", label: "Comparar" },
  { href: "/rankings", label: "Ranking" },
  { href: "/garagem", label: "Minha Garagem" },
] as const;

const bottomNav = [
  { href: "/", label: "Início", icon: Home },
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/criar-projeto", label: "Criar", icon: Plus },
  { href: "/garagem", label: "Garagem", icon: Warehouse },
  { href: "/rankings", label: "Ranking", icon: Trophy },
] as const;

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
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

function UserAvatar({
  avatarUrl,
  displayName,
  className,
}: {
  avatarUrl: string | null;
  displayName: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/25 bg-accent/10 text-xs font-ui font-bold text-accent",
        className
      )}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
      ) : (
        displayName.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function SiteNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const displayName = getAuthUserName(user) ?? "Membro Projeto Garagem";
  const avatarUrl = getAuthUserAvatar(user);
  const isActive = React.useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  );
  const handleSignOut = React.useCallback(async () => {
    await signOut();
    router.push("/");
    router.refresh();
  }, [router, signOut]);

  const profileMenu = user ? (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-w-0 max-w-[230px] items-center gap-2 rounded-3xl border border-border/70 bg-background/35 px-2.5 py-1.5 text-left transition hover:bg-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Abrir menu do perfil"
        >
          <UserAvatar avatarUrl={avatarUrl} displayName={displayName} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-ui font-semibold text-foreground">
              {displayName}
            </span>
            {user.email && user.email !== displayName ? (
              <span className="block truncate text-[11px] text-muted">{user.email}</span>
            ) : null}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[70] min-w-[220px] rounded-3xl border border-border/70 bg-card/95 p-2 shadow-2xl backdrop-blur"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/perfil"
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-ui font-semibold outline-none transition hover:bg-background/55 focus:bg-background/55"
            >
              <User className="size-4" />
              Meu perfil
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <button
              type="button"
              disabled={loading}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-ui font-semibold text-danger outline-none transition hover:bg-danger/10 focus:bg-danger/10 disabled:opacity-50"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  ) : null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="px-2.5 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mt-2 rounded-[1.75rem] pg-glass lg:mt-3 lg:rounded-4xl">
              <div className="flex min-h-14 items-center justify-between gap-2 px-2.5 py-1.5 lg:min-h-0 lg:gap-3 lg:px-5 lg:py-3">
                <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Projeto Garagem - inicio">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 shadow-glow lg:size-10 lg:rounded-3xl">
                    <CarFront className="size-4 text-accent lg:size-5" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="whitespace-nowrap font-title text-sm tracking-tight min-[360px]:text-base">Projeto Garagem</p>
                    <p className="hidden text-[10px] text-muted min-[390px]:block lg:text-[11px]">Projetos reais</p>
                  </div>
                </Link>

                <nav className="hidden items-center gap-5 lg:flex">
                  {nav.map((item) => (
                    <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
                  ))}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                  {user ? (
                    <>
                      <NotificationBell userId={user.id} />
                      {profileMenu}
                    </>
                  ) : (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/login">Entrar</Link>
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link href="/criar-projeto">Criar projeto</Link>
                  </Button>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
                  {user ? (
                    <NotificationBell userId={user.id} />
                  ) : null}
                  {user ? (
                    <div className="[&>button]:size-10 [&>button]:max-w-none [&>button]:rounded-3xl [&>button]:p-1 [&>button>span:nth-child(2)]:hidden [&>button>svg]:hidden">
                      {profileMenu}
                    </div>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="h-10 px-3">
                      <Link href="/login">Entrar</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 px-2.5 pb-[calc(8px+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-[calc(10px+env(safe-area-inset-bottom,0px))] lg:hidden">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-[1.75rem] pg-glass sm:rounded-4xl">
            <div className="grid grid-cols-5 gap-0.5 p-1.5 sm:gap-1 sm:p-2">
              {bottomNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 transition active:scale-[0.99] sm:gap-1 sm:rounded-3xl sm:px-2 sm:py-2",
                      active
                        ? "bg-accent/10 border border-accent/25 shadow-glow"
                        : "text-muted hover:text-foreground hover:bg-background/35"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-2xl border transition-colors sm:size-10 sm:rounded-3xl",
                        active
                          ? "border-accent/25 bg-accent/10 text-accent"
                          : "border-border/70 bg-background/20 text-muted group-hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4 sm:size-5" />
                    </span>
                    <span className="max-w-full truncate text-[10px] font-ui font-semibold tracking-tight sm:text-[11px]">
                      {item.label}
                    </span>
                    <span className={cn("h-0.5 w-0.5 rounded-full transition sm:h-1 sm:w-1", active ? "bg-accent shadow-glow" : "bg-transparent")} aria-hidden="true" />
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
