"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { UserPlus, UserCheck } from "lucide-react";

import { toggleFollowUserAction } from "@/app/carros/actions";
import { LoginPromptDialog } from "@/components/auth/login-prompt-dialog";
import { Button } from "@/components/ui/button";

export function FollowProfileButton({
  profileId,
  initialFollowing,
  viewerLoggedIn,
}: {
  profileId: string;
  initialFollowing: boolean;
  viewerLoggedIn: boolean;
}) {
  const [isPending, setIsPending] = React.useState(false);
  const [following, setFollowing] = React.useState(initialFollowing);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const pendingRef = React.useRef(false);

  async function toggleFollow() {
    if (pendingRef.current) return;
    if (!viewerLoggedIn) {
      setLoginOpen(true);
      return;
    }

    const previous = following;
    const next = !previous;
    pendingRef.current = true;
    flushSync(() => {
      setActionError(null);
      setFollowing(next);
      setIsPending(true);
    });

    try {
      const result = await toggleFollowUserAction(profileId);
      if (!result.ok) {
        flushSync(() => {
          setFollowing(previous);
          setActionError(result.message ?? "Não foi possível atualizar este perfil.");
        });
      } else {
        setFollowing(result.active);
      }
    } catch {
      flushSync(() => {
        setFollowing(previous);
        setActionError("Não foi possível atualizar este perfil.");
      });
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <>
      <LoginPromptDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Entre para seguir"
        description="Siga perfis para acompanhar garagens e futuras atualizações da comunidade."
      />
      <Button
        type="button"
        variant={following ? "outline" : "default"}
        disabled={isPending}
        aria-pressed={following}
        aria-busy={isPending}
        className="disabled:opacity-100"
        onClick={() => void toggleFollow()}
      >
        {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
        {following ? "Seguindo" : "Seguir"}
      </Button>
      {actionError ? <p className="mt-2 text-sm text-danger" role="status" aria-live="polite">{actionError}</p> : null}
    </>
  );
}
