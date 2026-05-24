"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { communityCreators, seedCommentsByBuildId } from "@/lib/data/community";
import { SocialComment, useSocialStore } from "@/stores/social-store";

function formatCount(value: number) {
  return value.toLocaleString("pt-BR");
}

const EMPTY_COMMENTS: SocialComment[] = [];

export function BuildSocialActions({
  buildId,
  baseLikes,
  baseSaves,
  baseComments,
  className,
}: {
  buildId: string;
  baseLikes: number;
  baseSaves: number;
  baseComments: number;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const liked = useSocialStore((s) => s.liked[buildId] ?? false);
  const saved = useSocialStore((s) => s.saved[buildId] ?? false);
  const comments = useSocialStore((s) => s.comments[buildId] ?? EMPTY_COMMENTS);
  const toggleLike = useSocialStore((s) => s.toggleLike);
  const toggleSave = useSocialStore((s) => s.toggleSave);
  const addComment = useSocialStore((s) => s.addComment);

  const likesCount = baseLikes + (liked ? 1 : 0);
  const savesCount = baseSaves + (saved ? 1 : 0);
  const commentsCount = baseComments + comments.length;

  const seed = seedCommentsByBuildId[buildId] ?? [];
  const seedResolved = seed.map((c) => {
    const creator = communityCreators.find((u) => u.id === c.creatorId);
    return {
      id: c.id,
      authorName: creator?.name ?? "Membro",
      authorHandle: creator ? `@${creator.handle}` : "@membro",
      message: c.message,
      createdAt: c.createdAt,
    };
  });

  const allComments = [...seedResolved, ...comments];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => toggleLike(buildId)}
        className={cn(
          "h-10 px-3 rounded-3xl border border-border/70 bg-background/20 hover:bg-background/40",
          liked && "border-accent/35 bg-accent/10 shadow-glow"
        )}
        aria-pressed={liked}
      >
        <Heart
          fill={liked ? "currentColor" : "none"}
          className={cn("size-4", liked ? "text-accent" : "text-muted")}
        />
        <span className="text-xs font-semibold tabular-nums">
          {formatCount(likesCount)}
        </span>
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-10 px-3 rounded-3xl border border-border/70 bg-background/20 hover:bg-background/40"
          >
            <MessageCircle className="size-4 text-muted" />
            <span className="text-xs font-semibold tabular-nums">
              {formatCount(commentsCount)}
            </span>
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-4 top-10 max-h-[calc(100vh-80px)] overflow-auto rounded-4xl pg-glass p-5 md:inset-x-0 md:left-1/2 md:max-w-2xl md:-translate-x-1/2 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="font-title text-xl tracking-tight">
                  Comentários
                </Dialog.Title>
                <p className="mt-1 text-sm text-muted">
                  {formatCount(commentsCount)} comentários •{" "}
                  <Link
                    href="/comunidade"
                    className="text-accent hover:brightness-110 transition"
                  >
                    ver feed
                  </Link>
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground hover:bg-background/55 transition"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-5 space-y-3">
              {allComments.length > 0 ? (
                allComments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-4xl border border-border/70 bg-background/25 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-ui font-semibold tracking-tight truncate">
                          {c.authorName}{" "}
                          <span className="text-xs text-muted font-normal">
                            {c.authorHandle}
                          </span>
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {c.createdAt}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">{c.message}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
                  Seja o primeiro a comentar.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-4xl border border-border/70 bg-background/25 p-4">
              <p className="text-xs text-muted">Comentar como</p>
              <p className="mt-1 text-sm font-ui font-semibold tracking-tight">
                Você <span className="text-xs text-muted font-normal">@you</span>
              </p>

              <div className="mt-3 flex gap-2 items-stretch">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva um comentário…"
                  className="pg-control min-h-[44px] flex-1 resize-none rounded-3xl px-4 py-3 text-sm placeholder:text-muted outline-none"
                />
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0"
                  disabled={message.trim().length === 0}
                  onClick={() => {
                    const trimmed = message.trim();
                    if (!trimmed) return;
                    addComment(buildId, {
                      authorName: "Você",
                      authorHandle: "@you",
                      message: trimmed,
                    });
                    setMessage("");
                  }}
                  aria-label="Enviar comentário"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => toggleSave(buildId)}
        className={cn(
          "h-10 px-3 rounded-3xl border border-border/70 bg-background/20 hover:bg-background/40",
          saved && "border-accent/35 bg-accent/10 shadow-glow"
        )}
        aria-pressed={saved}
      >
        <Bookmark
          fill={saved ? "currentColor" : "none"}
          className={cn("size-4", saved ? "text-accent" : "text-muted")}
        />
        <span className="text-xs font-semibold tabular-nums">
          {formatCount(savesCount)}
        </span>
      </Button>
    </div>
  );
}
