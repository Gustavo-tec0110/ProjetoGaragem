"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type BuildGalleryImage = {
  src: string;
  alt: string;
  label?: string;
};

export function BuildGallery({
  images,
  className,
}: {
  images: BuildGalleryImage[];
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const safeImages = images.length > 0 ? images : [{ src: "/ref/hero-car.jpg", alt: "" }];
  const [activeIndex, setActiveIndex] = React.useState(0);

  const active = safeImages[Math.min(activeIndex, safeImages.length - 1)];

  const canGoPrev = safeImages.length > 1;
  const canGoNext = safeImages.length > 1;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-4xl border border-border/70 bg-background/20">
        <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-18" />
        <div className="absolute inset-0 pointer-events-none pg-particles opacity-35" />

        <div className="relative aspect-[16/11] sm:aspect-[16/9]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.src}
              className="absolute inset-0"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Image src={active.src} alt={active.alt} fill priority className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/15" />
            </motion.div>
          </AnimatePresence>
        </div>

        {safeImages.length > 1 ? (
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length)}
              className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground transition active:scale-[0.98] disabled:opacity-40"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="rounded-full border border-border/70 bg-background/35 px-3 py-1 text-xs font-ui font-semibold text-muted">
              {activeIndex + 1}/{safeImages.length}
            </div>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setActiveIndex((i) => (i + 1) % safeImages.length)}
              className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground transition active:scale-[0.98] disabled:opacity-40"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {safeImages.map((img, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={img.src + idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "group relative snap-start shrink-0 overflow-hidden rounded-3xl border bg-background/20 transition",
                isActive
                  ? "border-accent/45 shadow-glow"
                  : "border-border/70 hover:border-accent/25"
              )}
              aria-current={isActive}
            >
              <div className="relative h-16 w-24 sm:h-20 sm:w-28">
                <Image src={img.src} alt={img.alt} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              </div>
              {img.label ? (
                <div className="absolute bottom-2 left-2 right-2 truncate text-[11px] font-ui font-semibold text-foreground/90">
                  {img.label}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

