"use client";

import * as React from "react";
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
  const [isPending, startTransition] = React.useTransition();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [loginOpen, setLoginOpen] = React.useState(false);

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
        onClick={() => {
          if (!viewerLoggedIn) {
            setLoginOpen(true);
            return;
          }

          startTransition(async () => {
            const next = !following;
            setFollowing(next);
            const result = await toggleFollowUserAction(profileId);
            if (!result.ok) setFollowing(!next);
          });
        }}
      >
        {following ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
        {following ? "Seguindo" : "Seguir"}
      </Button>
    </>
  );
}
