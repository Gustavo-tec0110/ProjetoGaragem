"use client";

import * as React from "react";
import { useActionState } from "react";
import { Camera, ImagePlus, LoaderCircle, Upload } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { saveProfileAction, type ActionState } from "@/app/carros/actions";
import { useAuth } from "@/components/AuthProvider";
import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeSlug } from "@/lib/garage/constants";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  PROJECT_IMAGE_MAX_BYTES,
  PROJECT_IMAGES_BUCKET,
  isAllowedProjectImage,
  profileImagePath,
} from "@/lib/supabase/storage";
import type { ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialActionState: ActionState = { status: "idle", message: "" };

function uploadErrorMessage(uploadError: unknown) {
  if (!(uploadError instanceof Error)) return "Não foi possível enviar a imagem agora.";
  if (uploadError.message.toLowerCase().includes("bucket")) {
    return `Não foi possível acessar o bucket "${PROJECT_IMAGES_BUCKET}".`;
  }
  return uploadError.message || "Não foi possível enviar a imagem agora.";
}

function ProfileImageField({
  kind,
  label,
  value,
  onChange,
}: {
  kind: "avatar" | "cover";
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const isAvatar = kind === "avatar";

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!isAllowedProjectImage(file) || file.size > PROJECT_IMAGE_MAX_BYTES) {
      setError("Envie JPG, PNG ou WebP com até 5 MB.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase não está configurado para enviar imagens.");
      return;
    }
    const currentUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      setError("Entre na sua conta para enviar imagens.");
      return;
    }

    setPending(true);
    try {
      const path = profileImagePath(currentUser.id, kind, file);
      const { error: uploadError } = await supabase.storage
        .from(PROJECT_IMAGES_BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(PROJECT_IMAGES_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm text-muted">{label}</span>
      <input name={`${kind}_url`} type="hidden" value={value} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void upload(event.currentTarget.files?.[0])}
      />
      <div
        className={cn(
          "relative overflow-hidden border border-border/70 bg-background/55",
          isAvatar ? "size-24 rounded-full" : "aspect-[3/1] min-h-28 rounded-2xl"
        )}
      >
        {value ? (
          <ProjectImage
            src={value}
            alt={label}
            fill
            className="object-cover"
            sizes={isAvatar ? "96px" : "(min-width: 768px) 560px, 90vw"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_25%_25%,rgba(255,53,47,0.16),transparent_45%)] text-muted">
            {isAvatar ? <Camera className="size-6" /> : <ImagePlus className="size-7" />}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {pending ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
        </Button>
        {value ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            Remover
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger" role="status">{error}</p> : null}
    </div>
  );
}

export function ProfileForm({
  profile,
  defaultEmail,
  embedded = false,
  onSaved,
}: {
  profile?: ProfileRow | null;
  defaultEmail?: string | null;
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveProfileAction, initialActionState);
  const [avatarUrl, setAvatarUrl] = React.useState(profile?.avatar_url ?? "");
  const [coverUrl, setCoverUrl] = React.useState(profile?.cover_url ?? "");
  const [username, setUsername] = React.useState(profile?.username ?? "");
  const router = useRouter();
  const pathname = usePathname();
  const handledStateRef = React.useRef<ActionState>(initialActionState);

  React.useEffect(() => {
    if (state.status !== "success" || handledStateRef.current === state) return;
    handledStateRef.current = state;
    onSaved?.();
    if (!profile) {
      router.replace("/garagem");
      return;
    }
    if (pathname.startsWith("/perfil/")) {
      router.replace(`/perfil/${normalizeSlug(username)}`);
      return;
    }
    router.refresh();
  }, [onSaved, pathname, profile, router, state, username]);

  const content = (
    <>
      {!embedded ? (
        <>
          <p className="text-xs text-muted">Perfil de usuário</p>
          <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-3xl">Complete sua garagem</h1>
          <p className="mt-2 text-sm text-muted">Seu perfil identifica você na comunidade e apresenta seus projetos.</p>
        </>
      ) : null}

      <form action={formAction} className={cn("grid gap-4", !embedded && "mt-5 md:mt-6")}>
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <ProfileImageField kind="avatar" label="Foto de perfil" value={avatarUrl} onChange={setAvatarUrl} />
          <ProfileImageField kind="cover" label="Imagem de capa" value={coverUrl} onChange={setCoverUrl} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted">
            Nome
            <Input name="display_name" defaultValue={profile?.display_name ?? defaultEmail ?? ""} required />
          </label>
          <label className="grid gap-2 text-sm text-muted">
            Username
            <Input name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ex: gustavo-garage" required minLength={3} maxLength={24} autoCapitalize="none" />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-muted">
          Bio curta
          <textarea name="bio" defaultValue={profile?.bio ?? ""} className="pg-control min-h-24 w-full resize-none rounded-xl px-4 py-3 text-sm" placeholder="Conte um pouco sobre você e sua garagem." maxLength={240} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted">Cidade<Input name="city" defaultValue={profile?.city ?? ""} placeholder="São Paulo" /></label>
          <label className="grid gap-2 text-sm text-muted">Estado<Input name="state" defaultValue={profile?.state ?? ""} placeholder="SP" maxLength={2} /></label>
        </div>

        <label className="grid gap-2 text-sm text-muted">
          Instagram
          <Input name="instagram_handle" defaultValue={profile?.instagram_handle ?? ""} placeholder="ex: projetogaragem" />
        </label>

        <div className="grid gap-2">
          <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted">
            <input type="checkbox" name="is_saves_public" value="true" defaultChecked={profile?.is_saves_public ?? false} className="mt-0.5 size-4 accent-red-500" />
            Mostrar meus carros salvos no perfil público
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted">
            <input type="checkbox" name="is_likes_public" value="true" defaultChecked={profile?.is_likes_public ?? false} className="mt-0.5 size-4 accent-red-500" />
            Mostrar meus projetos curtidos no perfil público
          </label>
        </div>

        {state.status === "error" ? (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{state.message}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="mobile-cta-safe w-full sm:ml-auto sm:w-auto">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {pending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </form>
    </>
  );

  if (embedded) return content;
  return <Card className="p-4 md:p-8">{content}</Card>;
}
