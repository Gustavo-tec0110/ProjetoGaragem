"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Pencil, X } from "lucide-react";

import { ProfileForm } from "@/components/garage/profile-form";
import { Button } from "@/components/ui/button";
import type { ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EditProfileDialog({
  profile,
  defaultEmail,
  trigger = "edit",
  className,
}: {
  profile: ProfileRow;
  defaultEmail?: string | null;
  trigger?: "edit" | "cover" | "avatar";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerContent = trigger === "cover"
    ? <><Camera className="size-4" /> Alterar capa</>
    : trigger === "avatar"
      ? <Camera className="size-4" />
      : <><Pencil className="size-4" /> Editar perfil</>;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          size={trigger === "avatar" ? "icon" : "sm"}
          variant="outline"
          className={cn("bg-background/75 shadow-soft backdrop-blur-md", trigger === "avatar" && "size-10 rounded-full", className)}
          aria-label={trigger === "avatar" ? "Alterar foto de perfil" : undefined}
        >
          {triggerContent}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-title text-2xl tracking-tight">Editar perfil</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Atualize sua identidade e as preferências públicas da garagem.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" size="icon" variant="ghost" className="size-10 shrink-0" aria-label="Fechar"><X className="size-5" /></Button>
            </Dialog.Close>
          </div>
          <div className="mt-5">
            <ProfileForm profile={profile} defaultEmail={defaultEmail} embedded onSaved={() => setOpen(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
