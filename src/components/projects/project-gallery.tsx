"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Images, X } from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";

export function ProjectGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [activeImage, setActiveImage] = React.useState<string | null>(null);

  if (!images.length) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-6 text-sm text-muted">
        <Images className="mb-3 size-8 text-accent" />
        Este projeto ainda não tem fotos publicadas. Quando o dono adicionar imagens, a
        galeria aparece aqui.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-4xl border border-border/70 bg-surface text-left"
            onClick={() => setActiveImage(image)}
          >
            <ProjectImage
              src={image}
              alt={`Foto ${index + 1} do projeto ${title}`}
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            />
            {index === 0 ? (
              <span className="absolute left-3 top-3 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold">
                Principal
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <Dialog.Root open={Boolean(activeImage)} onOpenChange={(open) => !open && setActiveImage(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-w-5xl -translate-y-1/2 overflow-hidden rounded-4xl border border-border/70 bg-surface p-3 shadow-2xl">
            <Dialog.Title className="sr-only">Foto ampliada de {title}</Dialog.Title>
            <div className="relative aspect-[16/10] max-h-[78vh] overflow-hidden rounded-3xl bg-background">
              {activeImage ? (
                <ProjectImage
                  src={activeImage}
                  alt={`Foto ampliada do projeto ${title}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="absolute right-5 top-5 size-10 bg-background/70"
              >
                <X className="size-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
