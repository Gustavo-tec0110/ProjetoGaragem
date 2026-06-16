"use client";

import * as React from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import {
  createCommentAction,
  deleteCommentAction,
  type ActionState,
} from "@/app/carros/actions";
import { LoginPromptDialog } from "@/components/auth/login-prompt-dialog";
import { Button } from "@/components/ui/button";
import type { CarCommentWithAuthor } from "@/lib/supabase/queries";

const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export function CommentForm({
  carId,
  slug,
  viewerLoggedIn,
}: {
  carId: string;
  slug: string;
  viewerLoggedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(createCommentAction, initialActionState);
  const [loginOpen, setLoginOpen] = React.useState(false);

  if (!viewerLoggedIn) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
        <LoginPromptDialog
          open={loginOpen}
          onOpenChange={setLoginOpen}
          title="Entre para comentar"
          description="Comentários ajudam o dono do projeto e mantêm a comunidade viva."
        />
        <p>Entre na sua conta para comentar neste projeto.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setLoginOpen(true)}
        >
          Entrar para comentar
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="car_id" value={carId} />
      <input type="hidden" name="slug" value={slug} />
      <textarea
        name="content"
        required
        minLength={2}
        maxLength={1000}
        placeholder="Comente sobre o setup, tire uma duvida ou deixe uma sugestao."
        className="pg-control min-h-28 w-full resize-none rounded-3xl px-4 py-3 text-sm"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {state.message ? (
          <p className={state.status === "error" ? "text-sm text-danger" : "text-sm text-success"}>
            {state.message}
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Publicando..." : "Comentar"}
        </Button>
      </div>
    </form>
  );
}

export function CommentsList({
  comments,
  viewerId,
  ownerId,
  carSlug,
}: {
  comments: CarCommentWithAuthor[];
  viewerId: string | null;
  ownerId: string;
  carSlug: string;
}) {
  const [isPending, startTransition] = React.useTransition();

  if (!comments.length) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
        Nenhum comentario ainda. Seja a primeira pessoa a ajudar esse projeto.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const canDelete = viewerId === comment.user_id || viewerId === ownerId;
        return (
          <article key={comment.id} className="rounded-4xl border border-border/70 bg-background/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-ui text-sm font-semibold">
                  {comment.author?.display_name ?? "Membro"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  @{comment.author?.username ?? "usuario"} -{" "}
                  {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {canDelete ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Apagar comentario"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteCommentAction(comment.id, carSlug);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{comment.content}</p>
          </article>
        );
      })}
    </div>
  );
}
