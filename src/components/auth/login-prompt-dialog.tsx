"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LogIn, X } from "lucide-react";
import Link from "next/link";

import { GoogleSigninButton } from "@/components/auth/google-signin-button";
import { Button } from "@/components/ui/button";

export function LoginPromptDialog({
  open,
  onOpenChange,
  title = "Entre para continuar",
  description = "Use sua conta para curtir, salvar, comentar e acompanhar projetos reais.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-4xl border border-border/70 bg-surface p-5 shadow-2xl md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-title text-2xl tracking-tight">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-muted">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" size="icon" variant="ghost" className="size-10">
                <X className="size-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-3">
            <GoogleSigninButton />
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <LogIn className="size-4" />
                Abrir tela de login
              </Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
