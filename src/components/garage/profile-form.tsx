"use client";

import { useActionState } from "react";

import { saveProfileAction, type ActionState } from "@/app/carros/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProfileRow } from "@/lib/types";

const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export function ProfileForm({
  profile,
  defaultEmail,
}: {
  profile?: ProfileRow | null;
  defaultEmail?: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialActionState);

  return (
    <Card className="p-4 md:p-8">
      <p className="text-xs text-muted">Perfil de usuario</p>
      <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-3xl">
        Complete sua garagem
      </h1>
      <p className="mt-2 text-sm text-muted">
        O perfil identifica a pessoa. Os carros ficam como paginas publicas separadas.
      </p>

      <form action={formAction} className="mt-4 grid gap-3 md:mt-6 md:gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted">
            Nome
            <Input name="display_name" defaultValue={profile?.display_name ?? defaultEmail ?? ""} required />
          </label>
          <label className="grid gap-2 text-sm text-muted">
            Username
            <Input
              name="username"
              defaultValue={profile?.username ?? ""}
              placeholder="ex: gustavo-garage"
              required
              minLength={3}
              maxLength={24}
              autoCapitalize="none"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-muted">
          Avatar URL
          <Input name="avatar_url" defaultValue={profile?.avatar_url ?? ""} placeholder="https://..." />
        </label>

        <label className="grid gap-2 text-sm text-muted">
          Bio curta
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ""}
            className="pg-control min-h-28 w-full resize-none rounded-3xl px-4 py-3 text-sm"
            placeholder="Ex: Projetos nacionais, turbo de rua e setup usavel no dia a dia."
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted">
            Cidade
            <Input name="city" defaultValue={profile?.city ?? ""} placeholder="Sao Paulo" />
          </label>
          <label className="grid gap-2 text-sm text-muted">
            Estado
            <Input name="state" defaultValue={profile?.state ?? ""} placeholder="SP" maxLength={2} />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-muted">
          Instagram
          <Input
            name="instagram_handle"
            defaultValue={profile?.instagram_handle ?? ""}
            placeholder="ex: projetogaragem"
          />
        </label>

        <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
          <input
            type="checkbox"
            name="is_saves_public"
            value="true"
            defaultChecked={profile?.is_saves_public ?? false}
            className="size-4 accent-red-500"
          />
          Mostrar meus carros salvos no perfil publico
        </label>

        <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
          <input
            type="checkbox"
            name="is_likes_public"
            value="true"
            defaultChecked={profile?.is_likes_public ?? false}
            className="size-4 accent-red-500"
          />
          Mostrar meus projetos curtidos no perfil público
        </label>

        {state.status === "error" ? (
          <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="mobile-cta-safe w-full md:w-auto">
          {pending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </form>
    </Card>
  );
}
