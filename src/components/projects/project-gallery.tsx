"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";

export function ProjectGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

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
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3" aria-label="Fotos do projeto">
        {images.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            className="group relative aspect-[4/3] min-w-[calc(100%-2rem)] snap-center overflow-hidden rounded-3xl border border-border/70 bg-surface text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:min-w-0 sm:rounded-4xl"
            onClick={() => setActiveIndex(index)}
            aria-label={`Ampliar foto ${index + 1} de ${images.length}`}
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
            <span className="absolute bottom-3 right-3 rounded-full border border-border/70 bg-background/75 px-2 py-1 text-[10px] font-semibold sm:hidden">
              {index + 1}/{images.length}
            </span>
          </button>
        ))}
      </div>

      <Dialog.Root open={activeIndex !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-3 top-1/2 z-[90] mx-auto max-w-5xl -translate-y-1/2 overflow-hidden rounded-3xl border border-border/70 bg-surface p-2 shadow-2xl sm:inset-x-4 sm:rounded-4xl sm:p-3">
            <Dialog.Title className="sr-only">Foto ampliada de {title}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Visualizacao ampliada da foto selecionada do projeto.
            </Dialog.Description>
            <div className="relative aspect-[16/10] max-h-[78vh] overflow-hidden rounded-3xl bg-background">
              {activeIndex !== null ? (
                <ProjectImage
                  src={images[activeIndex]}
                  alt={`Foto ampliada do projeto ${title}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              ) : null}
              {images.length > 1 && activeIndex !== null ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="absolute left-2 top-1/2 size-11 -translate-y-1/2 bg-background/75 sm:left-4"
                    aria-label="Foto anterior"
                    onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)}
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="absolute right-2 top-1/2 size-11 -translate-y-1/2 bg-background/75 sm:right-4"
                    aria-label="Próxima foto"
                    onClick={() => setActiveIndex((activeIndex + 1) % images.length)}
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/75 px-3 py-1 text-xs font-semibold">
                    {activeIndex + 1} de {images.length}
                  </span>
                </>
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
