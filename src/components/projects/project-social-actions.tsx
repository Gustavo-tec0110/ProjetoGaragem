"use client";

import * as React from "react";
import { BellPlus, Bookmark, Copy, Heart, Share2 } from "lucide-react";

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
}) {
  const [isPending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
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
    () => ({ liked: false, saved: false, views: 0 })
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

  function reportSocialActionError(action: string, message?: string) {
    console.error("[social-action]", action, message ?? "Falha sem mensagem retornada.");
  }

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

  return (
    <div className="flex flex-wrap gap-2">
      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Entre para interagir"
        description="Faça login para curtir, salvar e acompanhar projetos reais da comunidade."
      />
      <Button
        type="button"
        variant={followed ? "default" : "outline"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            if (usingServer && databaseId) {
              const next = !followed;
              setServerFollowed(next);
              setServerFollowers((current) => Math.max(0, current + (next ? 1 : -1)));
              onCountsChange?.({ followers: Math.max(0, followers + (next ? 1 : -1)) });
              const result = await toggleProjectFollowAction(databaseId);
              if (!result.ok) {
                reportSocialActionError("project_follows.toggle", result.message);
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

            if (mode === "supabase") {
              setLoginOpen(true);
            }
          })
        }
      >
        <BellPlus className="size-4" />
        {followed ? "Seguindo" : "Seguir"} ({followers.toLocaleString("pt-BR")})
      </Button>

      <Button
        type="button"
        variant={liked ? "default" : "outline"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            if (usingServer && databaseId) {
              const next = !liked;
              setServerLiked(next);
              setServerLikes((current) => Math.max(0, current + (next ? 1 : -1)));
              onCountsChange?.({ likes: Math.max(0, likes + (next ? 1 : -1)) });
              const result = await toggleLikeAction(databaseId);
              if (!result.ok) {
                reportSocialActionError("car_likes.toggle", result.message);
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
          })
        }
      >
        <Heart className="size-4" />
        Curtir ({likes.toLocaleString("pt-BR")})
      </Button>

      <Button
        type="button"
        variant={saved ? "default" : "outline"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            if (usingServer && databaseId) {
              const next = !saved;
              setServerSaved(next);
              setServerSaves((current) => Math.max(0, current + (next ? 1 : -1)));
              onCountsChange?.({ saves: Math.max(0, saves + (next ? 1 : -1)) });
              const result = await toggleSaveAction(databaseId);
              if (!result.ok) {
                reportSocialActionError("car_saves.toggle", result.message);
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
          })
        }
      >
        <Bookmark className="size-4" />
        Salvar ({saves.toLocaleString("pt-BR")})
      </Button>

      <Button type="button" variant="outline" onClick={() => void copyLink()}>
        <Copy className="size-4" />
        {copied ? "Copiado" : "Copiar link"}
      </Button>

      <Button type="button" variant="outline" onClick={() => void shareLink()}>
        <Share2 className="size-4" />
        Compartilhar
      </Button>
    </div>
  );
}

export async function syncProjectView(projectId: string | null, slug: string) {
  if (!projectId) return null;
  return incrementViewAction(projectId, slug);
}
