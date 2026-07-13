"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import {
  ArrowRightLeft,
  BellPlus,
  Bookmark,
  Calendar,
  Copy,
  Heart,
  MoreHorizontal,
  Pencil,
  Share2,
} from "lucide-react";

import {
  incrementViewAction,
  toggleProjectFollowAction,
  toggleLikeAction,
  toggleSaveAction,
} from "@/app/carros/actions";
import { LoginPromptDialog } from "@/components/auth/login-prompt-dialog";
import { Button } from "@/components/ui/button";
import {
  getLocalProjectSocialState,
  subscribeLocalProjectSocial,
  toggleLocalProjectLike,
  toggleLocalProjectSave,
} from "@/lib/projects/local-storage";

const EMPTY_LOCAL_SOCIAL_STATE = { liked: false, saved: false, views: 0 };

export function ProjectSocialActions({
  slug,
  databaseId,
  initialLiked,
  initialSaved,
  initialLikes,
  initialSaves,
  initialFollowed = false,
  initialFollowers = 0,
  mode,
  viewerLoggedIn,
  onCountsChange,
  compareHref,
  editHref,
  evolutionHref,
}: {
  slug: string;
  databaseId: string | null;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikes: number;
  initialSaves: number;
  initialFollowed?: boolean;
  initialFollowers?: number;
  mode: "supabase" | "local";
  viewerLoggedIn: boolean;
  onCountsChange?: (counts: Partial<{
    likes: number;
    saves: number;
    followers: number;
  }>) => void;
  compareHref: string;
  editHref?: string | null;
  evolutionHref: string;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [serverLiked, setServerLiked] = React.useState(initialLiked);
  const [serverSaved, setServerSaved] = React.useState(initialSaved);
  const [serverFollowed, setServerFollowed] = React.useState(initialFollowed);
  const [serverLikes, setServerLikes] = React.useState(initialLikes);
  const [serverSaves, setServerSaves] = React.useState(initialSaves);
  const [serverFollowers, setServerFollowers] = React.useState(initialFollowers);
  const localState = React.useSyncExternalStore(
    subscribeLocalProjectSocial,
    () => getLocalProjectSocialState(slug),
    () => EMPTY_LOCAL_SOCIAL_STATE
  );
  const usingServer = mode === "supabase" && viewerLoggedIn && Boolean(databaseId);
  const usingLocal = mode !== "supabase";
  const liked = usingServer ? serverLiked : usingLocal ? localState.liked : false;
  const saved = usingServer ? serverSaved : usingLocal ? localState.saved : false;
  const followed = usingServer ? serverFollowed : false;
  const likes = usingServer
    ? serverLikes
    : usingLocal
      ? initialLikes + (localState.liked ? 1 : 0)
      : initialLikes;
  const saves = usingServer
    ? serverSaves
    : usingLocal
      ? initialSaves + (localState.saved ? 1 : 0)
      : initialSaves;
  const followers = usingServer ? serverFollowers : initialFollowers;

  async function copyLink() {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    const payload = {
      title: "Projeto Garagem",
      text: "Olha esse projeto que encontrei no Projeto Garagem.",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return;
      }
    }

    await copyLink();
  }

  function updateLocalLike() {
    toggleLocalProjectLike(slug);
    onCountsChange?.({ likes: initialLikes + (!liked ? 1 : -1) });
  }

  function updateLocalSave() {
    toggleLocalProjectSave(slug);
    onCountsChange?.({ saves: initialSaves + (!saved ? 1 : -1) });
  }

  async function toggleFollow() {
    setActionError(null);
    if (usingServer && databaseId) {
      const next = !followed;
      setServerFollowed(next);
      setServerFollowers((current) => Math.max(0, current + (next ? 1 : -1)));
      onCountsChange?.({ followers: Math.max(0, followers + (next ? 1 : -1)) });
      const result = await toggleProjectFollowAction(databaseId);
      if (!result.ok) {
        setActionError(result.message ?? "Nao foi possivel seguir este projeto.");
        setServerFollowed(!next);
        setServerFollowers((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ followers });
        return;
      }
      if ("followersCount" in result && typeof result.followersCount === "number") {
        setServerFollowers(result.followersCount);
        onCountsChange?.({ followers: result.followersCount });
      }
      return;
    }

    if (mode === "supabase") setLoginOpen(true);
  }

  async function toggleLike() {
    setActionError(null);
    if (usingServer && databaseId) {
      const next = !liked;
      setServerLiked(next);
      setServerLikes((current) => Math.max(0, current + (next ? 1 : -1)));
      onCountsChange?.({ likes: Math.max(0, likes + (next ? 1 : -1)) });
      const result = await toggleLikeAction(databaseId);
      if (!result.ok) {
        setActionError(result.message ?? "Nao foi possivel curtir este projeto.");
        setServerLiked(!next);
        setServerLikes((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ likes });
        return;
      }
      if ("likesCount" in result && typeof result.likesCount === "number") {
        setServerLikes(result.likesCount);
        onCountsChange?.({ likes: result.likesCount });
      }
      return;
    }

    if (mode === "supabase") {
      setLoginOpen(true);
      return;
    }
    updateLocalLike();
  }

  async function toggleSave() {
    setActionError(null);
    if (usingServer && databaseId) {
      const next = !saved;
      setServerSaved(next);
      setServerSaves((current) => Math.max(0, current + (next ? 1 : -1)));
      onCountsChange?.({ saves: Math.max(0, saves + (next ? 1 : -1)) });
      const result = await toggleSaveAction(databaseId);
      if (!result.ok) {
        setActionError(result.message ?? "Nao foi possivel salvar este projeto.");
        setServerSaved(!next);
        setServerSaves((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ saves });
        return;
      }
      if ("savesCount" in result && typeof result.savesCount === "number") {
        setServerSaves(result.savesCount);
        onCountsChange?.({ saves: result.savesCount });
      }
      return;
    }

    if (mode === "supabase") {
      setLoginOpen(true);
      return;
    }
    updateLocalSave();
  }

  const mobileActionClass =
    "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-border/70 bg-background/40 px-1 py-1.5 text-foreground transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 disabled:opacity-50";

  return (
    <div className="w-full lg:w-auto">
      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Entre para interagir"
        description="Faça login para curtir, salvar e acompanhar projetos reais da comunidade."
      />
      {actionError ? (
        <p className="mb-2 text-sm text-danger" role="status" aria-live="polite">
          {actionError}
        </p>
      ) : null}
      <div className="grid grid-cols-5 gap-1.5 lg:hidden" aria-label="Ações do projeto" data-testid="mobile-project-actions">
        <button
          type="button"
          className={`${mobileActionClass} ${liked ? "border-accent/40 bg-accent/15 text-accent" : ""}`}
          disabled={isPending}
          aria-label={`${liked ? "Remover curtida" : "Curtir"}; ${likes.toLocaleString("pt-BR")} curtidas`}
          aria-pressed={liked}
          onClick={() => startTransition(toggleLike)}
        >
          <Heart className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold leading-none">{likes.toLocaleString("pt-BR")}</span>
          <span className="text-[9px] leading-none">Curtir</span>
        </button>
        <button
          type="button"
          className={`${mobileActionClass} ${saved ? "border-accent/40 bg-accent/15 text-accent" : ""}`}
          disabled={isPending}
          aria-label={`${saved ? "Remover dos salvos" : "Salvar"}; ${saves.toLocaleString("pt-BR")} salvos`}
          aria-pressed={saved}
          onClick={() => startTransition(toggleSave)}
        >
          <Bookmark className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold leading-none">{saves.toLocaleString("pt-BR")}</span>
          <span className="text-[9px] leading-none">Salvar</span>
        </button>
        <button
          type="button"
          className={`${mobileActionClass} ${followed ? "border-accent/40 bg-accent/15 text-accent" : ""}`}
          disabled={isPending}
          aria-label={`${followed ? "Deixar de seguir" : "Seguir"}; ${followers.toLocaleString("pt-BR")} seguidores`}
          aria-pressed={followed}
          onClick={() => startTransition(toggleFollow)}
        >
          <BellPlus className="size-4" aria-hidden="true" />
          <span className="text-xs font-semibold leading-none">{followers.toLocaleString("pt-BR")}</span>
          <span className="text-[9px] leading-none">{followed ? "Seguindo" : "Seguir"}</span>
        </button>
        <button
          type="button"
          className={mobileActionClass}
          aria-label="Compartilhar projeto"
          onClick={() => void shareLink()}
        >
          <Share2 className="size-4" aria-hidden="true" />
          <span className="text-[9px] font-semibold leading-none">Compartilhar</span>
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={mobileActionClass} aria-label="Mais ações do projeto">
              <MoreHorizontal className="size-4" aria-hidden="true" />
              <span className="text-[9px] font-semibold leading-none">Mais</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-[75] min-w-56 rounded-3xl border border-border/70 bg-card/95 p-2 shadow-2xl backdrop-blur"
            >
              <DropdownMenu.Item asChild>
                <button type="button" onClick={() => void copyLink()} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold outline-none focus:bg-background/55">
                  <Copy className="size-4" /> {copied ? "Link copiado" : "Copiar link"}
                </button>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={compareHref} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none focus:bg-background/55">
                  <ArrowRightLeft className="size-4" /> Comparar
                </Link>
              </DropdownMenu.Item>
              {editHref ? (
                <DropdownMenu.Item asChild>
                  <Link href={editHref} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none focus:bg-background/55">
                    <Pencil className="size-4" /> Editar ficha
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Item asChild>
                <Link href={evolutionHref} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold outline-none focus:bg-background/55">
                  <Calendar className="size-4" /> Evolução
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="hidden flex-wrap gap-2 lg:flex">
        <Button type="button" variant={followed ? "default" : "outline"} disabled={isPending} onClick={() => startTransition(toggleFollow)}>
          <BellPlus className="size-4" /> {followed ? "Seguindo" : "Seguir"} ({followers.toLocaleString("pt-BR")})
        </Button>
        <Button type="button" variant={liked ? "default" : "outline"} disabled={isPending} onClick={() => startTransition(toggleLike)}>
          <Heart className="size-4" /> Curtir ({likes.toLocaleString("pt-BR")})
        </Button>
        <Button type="button" variant={saved ? "default" : "outline"} disabled={isPending} onClick={() => startTransition(toggleSave)}>
          <Bookmark className="size-4" /> Salvar ({saves.toLocaleString("pt-BR")})
        </Button>
        <Button type="button" variant="outline" onClick={() => void copyLink()}>
          <Copy className="size-4" /> {copied ? "Copiado" : "Copiar link"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void shareLink()}>
          <Share2 className="size-4" /> Compartilhar
        </Button>
      </div>
    </div>
  );
}

export async function syncProjectView(projectId: string | null, slug: string) {
  if (!projectId) return null;
  return incrementViewAction(projectId, slug);
}
