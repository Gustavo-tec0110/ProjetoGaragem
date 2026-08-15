"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2, Upload } from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import { getAuthUserName } from "@/lib/auth/user";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  PROJECT_IMAGE_MAX_BYTES,
  PROJECT_IMAGES_BUCKET,
  isAllowedProjectImage,
  projectImagePath,
} from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import { measurePerformance, performanceTimer } from "@/lib/performance";

type ProjectImageUploaderProps = {
  mainPhotoUrl: string;
  photoUrls: string[];
  onMainPhotoChange: (url: string) => void;
  onPhotoUrlsChange: (urls: string[]) => void;
};

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean)));
}

function moveItem(items: string[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function uploadErrorMessage(uploadError: unknown) {
  const fallback = "Nao foi possivel enviar a imagem agora.";
  if (!(uploadError instanceof Error)) return fallback;

  const message = uploadError.message.toLowerCase();
  if (
    message.includes("bucket not found") ||
    (message.includes("bucket") && message.includes("not found"))
  ) {
    return `Bucket "${PROJECT_IMAGES_BUCKET}" nao encontrado no Supabase Storage. Aplique as migrations e tente novamente.`;
  }

  return uploadError.message || fallback;
}

export function ProjectImageUploader({
  mainPhotoUrl,
  photoUrls,
  onMainPhotoChange,
  onPhotoUrlsChange,
}: ProjectImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const { user, loading } = useAuth();
  const [resolvedUser, setResolvedUser] = React.useState<User | null>(user);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [fallbackUrl, setFallbackUrl] = React.useState("");
  const uploadUser = user ?? resolvedUser;
  const displayName = getAuthUserName(uploadUser) ?? "sua garagem";
  const gallery = uniqueUrls([mainPhotoUrl, ...photoUrls]);

  function setGallery(nextGallery: string[]) {
    const next = uniqueUrls(nextGallery);
    onMainPhotoChange(next[0] ?? "");
    onPhotoUrlsChange(next.slice(1));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase nao configurado para enviar imagens.");
      return;
    }

    let currentUser = uploadUser;
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      currentUser = data.user;
      setResolvedUser(currentUser);
    }

    if (!currentUser) {
      setError("Entre na sua conta para enviar imagens.");
      return;
    }

    const selectedFiles = Array.from(files);
    const invalid = selectedFiles.find(
      (file) => !isAllowedProjectImage(file) || file.size > PROJECT_IMAGE_MAX_BYTES
    );
    if (invalid) {
      setError("Envie apenas JPG, PNG ou WebP com até 5 MB por imagem.");
      return;
    }

    setPending(true);
    const uploadTimer = performanceTimer("upload", "project-images", {
      files: selectedFiles.length,
      totalBytes: selectedFiles.reduce((sum, file) => sum + file.size, 0),
    });
    try {
      const uploadedUrls: string[] = [];

      for (let index = 0; index < selectedFiles.length; index += 4) {
        const batch = selectedFiles.slice(index, index + 4);
        const batchUrls = await Promise.all(
          batch.map((file) =>
            measurePerformance(
              "upload",
              "storage.file",
              async () => {
                const path = projectImagePath(currentUser.id, file);
                const { error: uploadError } = await supabase.storage
                  .from(PROJECT_IMAGES_BUCKET)
                  .upload(path, file, {
                    cacheControl: "31536000",
                    contentType: file.type,
                    upsert: false,
                  });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from(PROJECT_IMAGES_BUCKET).getPublicUrl(path);
                return data.publicUrl || null;
              },
              { bytes: file.size, type: file.type }
            )
          )
        );
        uploadedUrls.push(...batchUrls.filter((url): url is string => Boolean(url)));
      }

      setGallery([...gallery, ...uploadedUrls]);
      uploadTimer.end({ ok: true, uploaded: uploadedUrls.length });
    } catch (uploadError) {
      uploadTimer.end({ ok: false });
      setError(uploadErrorMessage(uploadError));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function addFallbackUrl() {
    const url = fallbackUrl.trim();
    if (!url) return;
    setGallery([...gallery, url]);
    setFallbackUrl("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative min-h-72 overflow-hidden rounded-4xl border border-border/70 bg-surface">
          {mainPhotoUrl ? (
            <ProjectImage
              src={mainPhotoUrl}
              alt={`Foto principal de ${displayName}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/35 px-6 text-center text-muted">
              <ImagePlus className="size-10 text-accent" />
              <p className="font-ui text-sm font-semibold text-foreground">
                Adicione a primeira foto real do projeto.
              </p>
              <p className="max-w-sm text-sm">
                A imagem principal aparece no topo da página pública, no Explorar e nos rankings.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
          <p className="text-xs text-muted">Upload de imagens</p>
          <h3 className="mt-2 font-title text-xl tracking-tight">Fotos reais do carro</h3>
          <p className="mt-2 text-sm text-muted">
            Use JPG, PNG ou WebP com até 5 MB. O arquivo fica salvo no Supabase Storage.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => void uploadFiles(event.currentTarget.files)}
          />

          <div className="mt-5 grid gap-3">
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <Upload className="size-4" />
              {pending ? "Enviando..." : "Enviar fotos"}
            </Button>
            {!loading && !uploadUser ? (
              <p className="rounded-3xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted">
                Entre na conta para fazer upload. URLs externas continuam disponíveis como fallback.
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2">
            <p className="text-xs text-muted">Fallback por URL</p>
            <div className="flex gap-2">
              <Input
                value={fallbackUrl}
                onChange={(event) => setFallbackUrl(event.target.value)}
                placeholder="https://..."
              />
              <Button type="button" variant="outline" onClick={addFallbackUrl}>
                Adicionar
              </Button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {gallery.map((url, index) => {
          const isMain = index === 0;
          return (
            <div
              key={`${url}-${index}`}
              className={cn(
                "overflow-hidden rounded-4xl border bg-background/25",
                isMain ? "border-accent/45 shadow-glow" : "border-border/70"
              )}
            >
              <div className="relative aspect-[4/3] bg-surface">
                <ProjectImage
                  src={url}
                  alt={`Foto ${index + 1} do projeto`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
              </div>
              <div className="grid gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted">
                    {isMain ? "Principal" : `Foto ${index + 1}`}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9"
                      aria-label="Mover foto para cima"
                      disabled={index === 0}
                      onClick={() => setGallery(moveItem(gallery, index, index - 1))}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9"
                      aria-label="Mover foto para baixo"
                      disabled={index === gallery.length - 1}
                      onClick={() => setGallery(moveItem(gallery, index, index + 1))}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isMain ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setGallery([url, ...gallery.filter((item) => item !== url)])}
                    >
                      <Star className="size-4" />
                      Principal
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setGallery(gallery.filter((item) => item !== url))}
                  >
                    <Trash2 className="size-4" />
                    Remover
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
