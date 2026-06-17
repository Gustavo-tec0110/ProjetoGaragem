"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Heart, Share2 } from "lucide-react";

import { toggleLikeAction, toggleSaveAction } from "@/app/carros/actions";
import { Button } from "@/components/ui/button";

export function CarSocialActions({
  carId,
  liked,
  saved,
  likesCount,
  savesCount,
  viewerLoggedIn,
}: {
  carId: string;
  liked: boolean;
  saved: boolean;
  likesCount: number;
  savesCount: number;
  viewerLoggedIn: boolean;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [isLiked, setLiked] = React.useState(liked);
  const [isSaved, setSaved] = React.useState(saved);
  const [likes, setLikes] = React.useState(likesCount);
  const [saves, setSaves] = React.useState(savesCount);
  const [copied, setCopied] = React.useState(false);

  if (!viewerLoggedIn) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/login">Entrar para interagir</Link>
        </Button>
        <Button type="button" variant="outline" onClick={() => void navigator.clipboard?.writeText(window.location.href)}>
          <Share2 className="size-4" />
          Compartilhar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={isLiked ? "default" : "outline"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const next = !isLiked;
            setLiked(next);
            setLikes((current) => Math.max(0, current + (next ? 1 : -1)));
            const result = await toggleLikeAction(carId);
            if (!result.ok) {
              setLiked(!next);
              setLikes((current) => Math.max(0, current + (next ? -1 : 1)));
              return;
            }
            if ("likesCount" in result && typeof result.likesCount === "number") {
              setLikes(result.likesCount);
            }
          })
        }
      >
        <Heart className="size-4" />
        {likes.toLocaleString("pt-BR")}
      </Button>

      <Button
        type="button"
        variant={isSaved ? "default" : "outline"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const next = !isSaved;
            setSaved(next);
            setSaves((current) => Math.max(0, current + (next ? 1 : -1)));
            const result = await toggleSaveAction(carId);
            if (!result.ok) {
              setSaved(!next);
              setSaves((current) => Math.max(0, current + (next ? -1 : 1)));
              return;
            }
            if ("savesCount" in result && typeof result.savesCount === "number") {
              setSaves(result.savesCount);
            }
          })
        }
      >
        <Bookmark className="size-4" />
        {saves.toLocaleString("pt-BR")}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await navigator.clipboard?.writeText(window.location.href);
          setCopied(true);
        }}
      >
        <Share2 className="size-4" />
        {copied ? "Copiado" : "Compartilhar"}
      </Button>
    </div>
  );
}
