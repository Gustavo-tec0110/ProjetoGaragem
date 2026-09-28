"use client";

import * as React from "react";
import { useActionState } from "react";
import { AtSign, Camera, CirclePlay, ImagePlus, LoaderCircle, Music2, Upload } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { saveProfileAction, type ActionState } from "@/app/carros/actions";
import { ProfileImageCropDialog } from "@/components/garage/profile-image-crop-dialog";
import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeSlug } from "@/lib/garage/constants";
import {
  getProfileSocialLinks,
  normalizeSocialLink,
  SOCIAL_PLATFORMS,
  socialPlatformLabel,
  type SocialPlatform,
} from "@/lib/profile/social-links";
import {
  PROJECT_IMAGE_MAX_BYTES,
  isAllowedProjectImage,
} from "@/lib/supabase/storage";
import type { ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialActionState: ActionState = { status: "idle", message: "" };

function uploadErrorMessage(uploadError: unknown) {
  void uploadError;
  return "Não foi possível enviar a imagem agora. Tente novamente.";
}

async function uploadProfileImage(kind: "avatar" | "cover", file: File) {
  const formData = new FormData();
  formData.set("kind", kind);
  formData.set("file", file);
  const response = await fetch("/api/uploads/image", { method: "POST", body: formData });
  const body = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
  if (!response.ok || !body?.url) throw new Error(body?.message ?? "Não foi possível enviar a imagem agora.");
  return body.url;
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
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const isAvatar = kind === "avatar";

  function selectFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!isAllowedProjectImage(file) || file.size > PROJECT_IMAGE_MAX_BYTES) {
      setError("Envie JPG, PNG ou WebP com até 5 MB.");
      return;
    }
    setSelectedFile(file);
  }

  async function applyCrop(file: File) {
    setPending(true);
    try {
      onChange(await uploadProfileImage(kind, file));
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError));
      throw uploadError;
    } finally {
      setPending(false);
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
        onChange={(event) => {
          selectFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
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
      <ProfileImageCropDialog file={selectedFile} kind={kind} onCancel={() => setSelectedFile(null)} onApply={applyCrop} />
    </div>
  );
}

const socialIcons: Record<SocialPlatform, typeof AtSign> = {
  instagram: AtSign,
  tiktok: Music2,
  youtube: CirclePlay,
};

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
  const [socialLinks, setSocialLinks] = React.useState<Record<SocialPlatform, string>>(() => {
    const links = getProfileSocialLinks(profile?.social_links, profile?.instagram_handle);
    return Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform, links[platform] ?? ""])) as Record<SocialPlatform, string>;
  });
  const [socialErrors, setSocialErrors] = React.useState<Partial<Record<SocialPlatform, string>>>({});
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

  function validateSocialLinks() {
    const errors: Partial<Record<SocialPlatform, string>> = {};
    const normalized: Partial<Record<SocialPlatform, string>> = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const result = normalizeSocialLink(platform, socialLinks[platform]);
      if (!result.ok) errors[platform] = result.message;
      else normalized[platform] = result.value ?? "";
    }
    setSocialErrors(errors);
    if (Object.keys(errors).length) return false;
    setSocialLinks((current) => ({ ...current, ...normalized }));
    return true;
  }

  const content = (
    <>
      {!embedded ? (
        <>
          <p className="text-xs text-muted">Perfil de usuário</p>
          <h1 className="mt-1 font-title text-2xl tracking-tight md:mt-2 md:text-3xl">Complete sua garagem</h1>
          <p className="mt-2 text-sm text-muted">Seu perfil identifica você na comunidade e apresenta seus projetos.</p>
        </>
      ) : null}

      <form action={formAction} onSubmit={(event) => { if (!validateSocialLinks()) event.preventDefault(); }} className={cn("grid gap-4", !embedded && "mt-5 md:mt-6")}>
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

        <section className="rounded-2xl border border-border/70 bg-background/25 p-4 sm:p-5" aria-labelledby="social-links-title">
          <div>
            <h2 id="social-links-title" className="font-title text-lg tracking-tight text-foreground">Redes sociais</h2>
            <p className="mt-1 text-sm text-muted">Adicione os links que deseja exibir publicamente na sua garagem.</p>
          </div>
          <div className="mt-4 grid gap-3">
            {SOCIAL_PLATFORMS.map((platform) => {
              const Icon = socialIcons[platform];
              const error = socialErrors[platform];
              const inputId = `social-${platform}`;
              return (
                <label key={platform} className="grid gap-2 text-sm text-muted" htmlFor={inputId}>
                  <span className="inline-flex items-center gap-2 font-medium text-foreground"><Icon className="size-4 text-accent" aria-hidden="true" />{socialPlatformLabel(platform)}</span>
                  <Input
                    id={inputId}
                    name={`social_${platform}`}
                    value={socialLinks[platform]}
                    onChange={(event) => {
                      setSocialLinks((current) => ({ ...current, [platform]: event.target.value }));
                      setSocialErrors((current) => ({ ...current, [platform]: undefined }));
                    }}
                    onBlur={() => {
                      const result = normalizeSocialLink(platform, socialLinks[platform]);
                      setSocialErrors((current) => ({ ...current, [platform]: result.ok ? undefined : result.message }));
                      if (result.ok && result.value) setSocialLinks((current) => ({ ...current, [platform]: result.value }));
                    }}
                    placeholder={platform === "instagram" ? "instagram.com/sua-garagem" : platform === "tiktok" ? "tiktok.com/@sua-garagem" : "youtube.com/@sua-garagem"}
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                  />
                  {error ? <span id={`${inputId}-error`} className="text-xs text-danger">{error}</span> : null}
                </label>
              );
            })}
          </div>
        </section>

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
        {state.status === "success" ? (
          <p className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success" role="status">{state.message}</p>
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
