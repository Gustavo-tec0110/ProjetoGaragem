"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ProjectImage } from "@/components/projects/project-image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CarFront, ChevronDown, Compass, Home, LogOut, Plus, Trophy, User, Warehouse } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import { getAuthUserAvatar, getAuthUserName } from "@/lib/auth/user";
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
        "relative py-2 text-[13px] font-ui font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-accent after:transition-transform",
        active
          ? "text-foreground after:scale-x-100"
          : "text-muted hover:text-foreground after:scale-x-0"
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
        <ProjectImage src={avatarUrl} alt="" fill sizes="32px" className="object-cover" />
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
  const isExplore = pathname === "/explorar";
  const deferCreatePrefetch = pathname === "/" || pathname === "/login" || pathname === "/register" || isExplore;
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
          className="flex min-w-0 max-w-[230px] items-center gap-2 rounded-xl border border-border/70 bg-background/35 px-2 py-1.5 text-left transition hover:bg-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background max-lg:size-10 max-lg:max-w-none max-lg:p-1"
          aria-label="Abrir menu do perfil"
        >
          <UserAvatar avatarUrl={avatarUrl} displayName={displayName} />
          <span className="hidden min-w-0 leading-tight lg:block">
            <span className="block truncate text-sm font-ui font-semibold text-foreground">
              {displayName}
            </span>
            {user.email && user.email !== displayName ? (
              <span className="block truncate text-[11px] text-muted">{user.email}</span>
            ) : null}
          </span>
          <ChevronDown className="hidden size-4 shrink-0 text-muted lg:block" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-[70] min-w-[220px] rounded-2xl border border-border/70 bg-card/95 p-2 shadow-2xl backdrop-blur"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/perfil"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-ui font-semibold outline-none transition hover:bg-background/55 focus:bg-background/55"
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
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-ui font-semibold text-danger outline-none transition hover:bg-danger/10 focus:bg-danger/10 disabled:opacity-50"
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
      <header className={cn("fixed inset-x-0 top-0 z-50 border-b border-border/50", isExplore ? "bg-background" : "bg-background/88 backdrop-blur-xl")}>
        <div className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-[85rem]">
              <div className="flex min-h-16 items-center justify-between gap-2 lg:gap-4">
                <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="Projeto Garagem - início">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 lg:size-10">
                    <CarFront className="size-4 text-accent lg:size-5" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="whitespace-nowrap font-title text-sm tracking-tight min-[360px]:text-base">Projeto Garagem</p>
                    <p className="hidden text-[9px] font-ui uppercase tracking-[0.14em] text-muted min-[390px]:block">Builds com história</p>
                  </div>
                </Link>

                <nav className="hidden items-center gap-6 lg:flex">
                  {nav.map((item) => (
                    <NavLink key={item.href} href={item.href} label={item.label} active={isActive(item.href)} />
                  ))}
                </nav>

                <div className="flex shrink-0 items-center gap-1.5 lg:shrink lg:gap-2">
                  {user ? (
                    <>
                      <NotificationBell userId={user.id} />
                      {profileMenu}
                    </>
                  ) : (
                    <>
                      <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                        <Link href="/login">Entrar</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-10 px-3 lg:hidden">
                        <Link href="/login">Entrar</Link>
                      </Button>
                    </>
                  )}
                  <Button asChild size="sm" className="hidden lg:inline-flex">
                    <Link href="/criar-projeto" prefetch={deferCreatePrefetch ? false : undefined}>Criar projeto</Link>
                  </Button>
                </div>
              </div>
          </div>
        </div>
      </header>

      <nav aria-label="Navegação principal mobile" className={cn("fixed inset-x-0 bottom-0 z-50 border-t border-border/60 pb-[env(safe-area-inset-bottom,0px)] lg:hidden", isExplore ? "bg-card" : "bg-card/94 backdrop-blur-xl")}>
        <div className="mx-auto w-full max-w-2xl">
            <div className="grid grid-cols-5 gap-0.5 px-2 py-1.5 sm:px-4">
              {bottomNav.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                const isCreate = item.href === "/criar-projeto";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={isCreate && deferCreatePrefetch ? false : undefined}
                    className={cn(
                      "group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 transition active:scale-[0.98] sm:px-2",
                      active
                        ? "text-foreground"
                        : "text-muted hover:text-foreground",
                      isCreate && "-translate-y-2"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-xl transition-colors sm:size-10",
                        isCreate
                          ? "bg-accent text-white shadow-glow"
                          : active
                            ? "bg-accent/10 text-accent"
                            : "text-muted group-hover:bg-foreground/[0.05] group-hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4 sm:size-5" />
                    </span>
                    <span className={cn("max-w-full truncate text-[9px] font-ui font-semibold tracking-tight sm:text-[10px]", isCreate && "text-foreground")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
        </div>
      </nav>
    </>
  );
}
