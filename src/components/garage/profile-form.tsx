"use client";

import * as React from "react";
import { useActionState } from "react";

import { saveProfileAction, initialActionState } from "@/app/carros/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProfileRow } from "@/lib/types";

export function ProfileForm({
  profile,
  defaultEmail,
}: {
  profile?: ProfileRow | null;
  defaultEmail?: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialActionState);

  return (
    <Card className="p-6 md:p-8">
      <p className="text-xs text-muted">Perfil de usuario</p>
      <h1 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
        Complete sua garagem
      </h1>
      <p className="mt-2 text-sm text-muted">
        O perfil identifica a pessoa. Os carros ficam como paginas publicas separadas.
      </p>

      <form action={formAction} className="mt-6 grid gap-4">
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

        {state.status === "error" ? (
          <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </form>
    </Card>
  );
}
