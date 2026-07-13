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
        <div className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mt-2 rounded-4xl pg-glass md:mt-3">
              <div className="flex items-center justify-between gap-2 px-3 py-2 md:gap-3 md:px-5 md:py-3">
                <Link href="/" className="flex items-center gap-2">
                  <span className="inline-flex size-9 items-center justify-center rounded-3xl bg-accent/10 border border-accent/25 shadow-glow md:size-10">
                    <CarFront className="size-5 text-accent" />
                  </span>
                  <div className="leading-tight">
                    <p className="font-title tracking-tight">Projeto Garagem</p>
                    <p className="text-[11px] text-muted">Projetos reais</p>
                  </div>
                </Link>

                <nav className="hidden md:flex items-center gap-5">
                  {nav.map((item) => (
                    <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
                  ))}
                </nav>

                <div className="hidden md:flex items-center gap-2">
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

                <div className="md:hidden flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={user ? "/garagem" : "/login"} className="max-w-[156px] px-3">
                      {user ? (
                        <>
                          <UserAvatar avatarUrl={avatarUrl} displayName={displayName} className="size-6" />
                          <span className="min-w-0 truncate">{displayName}</span>
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Link>
                  </Button>
                  {user ? (
                    <NotificationBell userId={user.id} />
                  ) : null}
                  {user ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="danger"
                      className="size-10"
                      disabled={loading}
                      aria-label="Sair"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
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
                    <span className={cn("h-1 w-1 rounded-full transition", active ? "bg-accent shadow-glow" : "bg-transparent")} aria-hidden="true" />
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
