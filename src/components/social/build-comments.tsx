"use client";

import * as React from "react";
import Link from "next/link";
import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { communityCreators, seedCommentsByBuildId } from "@/lib/data/community";
import { SocialComment, useSocialStore } from "@/stores/social-store";

const EMPTY_COMMENTS: SocialComment[] = [];

function formatCount(value: number) {
  return value.toLocaleString("pt-BR");
}

export function BuildComments({
  buildId,
  baseComments,
  className,
}: {
  buildId: string;
  baseComments: number;
  className?: string;
}) {
  const [message, setMessage] = React.useState("");
  const comments = useSocialStore((s) => s.comments[buildId] ?? EMPTY_COMMENTS);
  const addComment = useSocialStore((s) => s.addComment);

  const seedResolved = React.useMemo(() => {
    const seed = seedCommentsByBuildId[buildId] ?? [];
    return seed.map((c) => {
      const creator = communityCreators.find((u) => u.id === c.creatorId);
      return {
        id: c.id,
        authorName: creator?.name ?? "Membro",
        authorHandle: creator ? `@${creator.handle}` : "@membro",
        message: c.message,
        createdAt: c.createdAt,
      };
    });
  }, [buildId]);

  const allComments = [...seedResolved, ...comments];
  const totalCount = baseComments + comments.length;

  return (
    <section className={cn("rounded-4xl border border-border/70 bg-background/25 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Comentários</p>
          <p className="mt-1 font-title tracking-tight text-lg">
            {formatCount(totalCount)} comentários
          </p>
          <p className="mt-1 text-sm text-muted">
            Interação instantânea — salva e sincroniza no dispositivo.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/comunidade">Abrir feed</Link>
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {allComments.length > 0 ? (
          allComments.map((c) => (
            <div key={c.id} className="rounded-4xl border border-border/70 bg-background/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-ui font-semibold tracking-tight truncate">
                    {c.authorName}{" "}
                    <span className="text-xs text-muted font-normal">{c.authorHandle}</span>
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
          <div className="rounded-4xl border border-border/70 bg-background/20 p-4 text-sm text-muted">
            Seja o primeiro a comentar.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-4xl border border-border/70 bg-background/20 p-4">
        <p className="text-xs text-muted">Comentar como</p>
        <p className="mt-1 text-sm font-ui font-semibold tracking-tight">
          Você <span className="text-xs text-muted font-normal">@you</span>
        </p>

        <div className="mt-3 flex gap-2 items-stretch">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva um comentário…"
            className="min-h-[44px] flex-1 resize-none rounded-3xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/45 focus:shadow-glow"
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
    </section>
  );
}
