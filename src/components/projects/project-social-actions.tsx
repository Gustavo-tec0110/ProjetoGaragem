"use client";

import * as React from "react";
import { Bookmark, Copy, Heart, Share2 } from "lucide-react";

import {
  incrementViewAction,
  toggleLikeAction,
  toggleSaveAction,
} from "@/app/carros/actions";
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
  mode,
  viewerLoggedIn,
}: {
  slug: string;
  databaseId: string | null;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikes: number;
  initialSaves: number;
  mode: "supabase" | "local";
  viewerLoggedIn: boolean;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [copied, setCopied] = React.useState(false);
  const [serverLiked, setServerLiked] = React.useState(initialLiked);
  const [serverSaved, setServerSaved] = React.useState(initialSaved);
  const [serverLikes, setServerLikes] = React.useState(initialLikes);
  const [serverSaves, setServerSaves] = React.useState(initialSaves);
  const localState = React.useSyncExternalStore(
    subscribeLocalProjectSocial,
    () => getLocalProjectSocialState(slug),
    () => ({ liked: false, saved: false, views: 0 })
  );
  const usingServer = mode === "supabase" && viewerLoggedIn && Boolean(databaseId);
  const liked = usingServer ? serverLiked : localState.liked;
  const saved = usingServer ? serverSaved : localState.saved;
  const likes = usingServer ? serverLikes : initialLikes + (localState.liked ? 1 : 0);
  const saves = usingServer ? serverSaves : initialSaves + (localState.saved ? 1 : 0);

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
  }

  function updateLocalSave() {
    toggleLocalProjectSave(slug);
  }

  return (
    <div className="flex flex-wrap gap-2">
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
              const result = await toggleLikeAction(databaseId);
              if (!result.ok) {
                setServerLiked(!next);
                setServerLikes((current) => Math.max(0, current + (next ? -1 : 1)));
              }
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
              const result = await toggleSaveAction(databaseId);
              if (!result.ok) {
                setServerSaved(!next);
                setServerSaves((current) => Math.max(0, current + (next ? -1 : 1)));
              }
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
  if (!projectId) return;
  await incrementViewAction(projectId, slug);
}
