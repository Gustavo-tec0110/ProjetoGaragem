"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import {
  ArrowRightLeft,
  BellPlus,
  Bookmark,
  Calendar,
  Copy,
  Heart,
  Pencil,
  Share2,
} from "lucide-react";

import {
  toggleProjectFollowAction,
  toggleLikeAction,
  toggleSaveAction,
} from "@/app/carros/actions";
import { LoginPromptDialog } from "@/components/auth/login-prompt-dialog";
import { Button } from "@/components/ui/button";
import { useCopyCurrentUrl } from "@/hooks/use-copy-current-url";
import {
  getLocalProjectSocialState,
  subscribeLocalProjectSocial,
  toggleLocalProjectLike,
  toggleLocalProjectSave,
} from "@/lib/projects/local-storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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
  const [likePending, setLikePending] = React.useState(false);
  const [savePending, setSavePending] = React.useState(false);
  const [followPending, setFollowPending] = React.useState(false);
  const likePendingRef = React.useRef(false);
  const savePendingRef = React.useRef(false);
  const followPendingRef = React.useRef(false);
  const { copied, copyCurrentUrl } = useCopyCurrentUrl();
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

    await copyCurrentUrl();
  }

  function updateLocalLike() {
    const nextLiked = toggleLocalProjectLike(slug);
    onCountsChange?.({ likes: initialLikes + Number(nextLiked) });
  }

  function updateLocalSave() {
    const nextSaved = toggleLocalProjectSave(slug);
    onCountsChange?.({ saves: initialSaves + Number(nextSaved) });
  }

  async function toggleFollow() {
    if (followPendingRef.current) return;
    setActionError(null);
    if (usingServer && databaseId) {
      const next = !followed;
      followPendingRef.current = true;
      flushSync(() => {
        setFollowPending(true);
        setServerFollowed(next);
        setServerFollowers((current) => Math.max(0, current + (next ? 1 : -1)));
        onCountsChange?.({ followers: Math.max(0, followers + (next ? 1 : -1)) });
      });
      let result;
      try {
        result = await toggleProjectFollowAction(databaseId);
      } catch {
        setActionError("Nao foi possivel seguir este projeto.");
        setServerFollowed(!next);
        setServerFollowers((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ followers });
        followPendingRef.current = false;
        setFollowPending(false);
        return;
      }
      followPendingRef.current = false;
      setFollowPending(false);
      if (!result.ok) {
        setActionError(result.message ?? "Nao foi possivel seguir este projeto.");
        setServerFollowed(!next);
        setServerFollowers((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ followers });
        return;
      }
      setServerFollowed(result.active);
      if ("followersCount" in result && typeof result.followersCount === "number") {
        setServerFollowers(result.followersCount);
        onCountsChange?.({ followers: result.followersCount });
      }
      return;
    }

    if (mode === "supabase") setLoginOpen(true);
  }

  async function toggleLike() {
    if (likePendingRef.current) return;
    setActionError(null);
    if (usingServer && databaseId) {
      const next = !liked;
      likePendingRef.current = true;
      flushSync(() => {
        setLikePending(true);
        setServerLiked(next);
        setServerLikes((current) => Math.max(0, current + (next ? 1 : -1)));
        onCountsChange?.({ likes: Math.max(0, likes + (next ? 1 : -1)) });
      });
      let result;
      try {
        result = await toggleLikeAction(databaseId);
      } catch {
        setActionError("Nao foi possivel curtir este projeto.");
        setServerLiked(!next);
        setServerLikes((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ likes });
        likePendingRef.current = false;
        setLikePending(false);
        return;
      }
      likePendingRef.current = false;
      setLikePending(false);
      if (!result.ok) {
        setActionError(result.message ?? "Nao foi possivel curtir este projeto.");
        setServerLiked(!next);
        setServerLikes((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ likes });
        return;
      }
      setServerLiked(result.active);
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
    if (savePendingRef.current) return;
    setActionError(null);
    if (usingServer && databaseId) {
      const next = !saved;
      savePendingRef.current = true;
      flushSync(() => {
        setSavePending(true);
        setServerSaved(next);
        setServerSaves((current) => Math.max(0, current + (next ? 1 : -1)));
        onCountsChange?.({ saves: Math.max(0, saves + (next ? 1 : -1)) });
      });
      let result;
      try {
        result = await toggleSaveAction(databaseId);
      } catch {
        setActionError("Nao foi possivel salvar este projeto.");
        setServerSaved(!next);
        setServerSaves((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ saves });
        savePendingRef.current = false;
        setSavePending(false);
        return;
      }
      savePendingRef.current = false;
      setSavePending(false);
      if (!result.ok) {
        setActionError(result.message ?? "Nao foi possivel salvar este projeto.");
        setServerSaved(!next);
        setServerSaves((current) => Math.max(0, current + (next ? -1 : 1)));
        onCountsChange?.({ saves });
        return;
      }
      setServerSaved(result.active);
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

  return (
    <div className="pg-project-actions w-full min-w-0" role="group" aria-label="Ações do projeto">
      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Entre para interagir"
        description="Faça login para curtir, salvar e acompanhar projetos reais da comunidade."
      />
      {actionError ? (
        <p className="mb-2 text-sm text-danger" role="status" aria-live="polite">{actionError}</p>
      ) : null}
      <div className="pg-social-group" role="group" aria-label="Interações sociais">
        <Button type="button" variant="outline" disabled={followPending} aria-label={`${followed ? "Seguindo" : "Seguir"} (${followers.toLocaleString("pt-BR")})`} aria-pressed={followed} aria-busy={followPending} onClick={() => void toggleFollow()}>
          <BellPlus aria-hidden="true" /> <span>{followed ? "Seguindo" : "Seguir"}</span>
          <span className="pg-action-count" aria-label={`${followers.toLocaleString("pt-BR")} seguidores`}>{followers.toLocaleString("pt-BR")}</span>
        </Button>
        <Button type="button" variant="outline" disabled={likePending} aria-label={`${liked ? "Curtido" : "Curtir"} (${likes.toLocaleString("pt-BR")})`} aria-pressed={liked} aria-busy={likePending} onClick={() => void toggleLike()}>
          <Heart className={liked ? "fill-current" : ""} aria-hidden="true" /> <span>{liked ? "Curtido" : "Curtir"}</span>
          <span className="pg-action-count" aria-label={`${likes.toLocaleString("pt-BR")} curtidas`}>{likes.toLocaleString("pt-BR")}</span>
        </Button>
        <Button type="button" variant="outline" disabled={savePending} aria-label={`${saved ? "Salvo" : "Salvar"} (${saves.toLocaleString("pt-BR")})`} aria-pressed={saved} aria-busy={savePending} onClick={() => void toggleSave()}>
          <Bookmark className={saved ? "fill-current" : ""} aria-hidden="true" /> <span>{saved ? "Salvo" : "Salvar"}</span>
          <span className="pg-action-count" aria-label={`${saves.toLocaleString("pt-BR")} salvos`}>{saves.toLocaleString("pt-BR")}</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => void shareLink()}>
          <Share2 aria-hidden="true" /> Compartilhar
        </Button>
      </div>
      <div className="pg-secondary-actions">
        <div role="group" aria-label="Ações complementares">
          <Button type="button" variant="ghost" onClick={() => void copyCurrentUrl()}>
            <Copy aria-hidden="true" /> {copied ? "Copiado" : "Copiar link"}
          </Button>
          <Button asChild variant="ghost"><Link href={compareHref}><ArrowRightLeft aria-hidden="true" /> Comparar</Link></Button>
        </div>
        <div role="group" aria-label="Gerenciamento e navegação">
          {editHref ? <Button asChild variant="ghost"><Link href={editHref}><Pencil aria-hidden="true" /> Editar ficha</Link></Button> : null}
          <Button asChild variant="ghost"><Link href={evolutionHref}><Calendar aria-hidden="true" /> Evolução</Link></Button>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{copied ? "Link copiado" : ""}</span>
    </div>
  );
}

export async function syncProjectView(projectId: string | null) {
  if (!projectId) return null;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false } as const;

  const { data, error } = await supabase.rpc("increment_car_view", {
    target_car_id: projectId,
  });
  const result = data?.[0];
  if (error || !result || typeof result.views_count !== "number") {
    return { ok: false } as const;
  }

  return {
    ok: true,
    incremented: result.incremented,
    viewsCount: result.views_count,
  } as const;
}
