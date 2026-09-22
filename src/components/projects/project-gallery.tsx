"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Images,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTOPLAY_DELAY_MS = 3_000;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

type Point = { x: number; y: number };
type NaturalSize = { width: number; height: number };

type GalleryImageProps = {
  alt: string;
  className?: string;
  onNaturalSize?: (size: NaturalSize) => void;
  preload?: boolean;
  sizes: string;
  src: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function distance(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

function GalleryImage({
  alt,
  className,
  onNaturalSize,
  preload = false,
  sizes,
  src,
}: GalleryImageProps) {
  const [loadedImage, setLoadedImage] = React.useState<{
    size: NaturalSize;
    src: string;
  } | null>(null);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const nextSize = {
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    };
    setLoadedImage({ size: nextSize, src });
    onNaturalSize?.(nextSize);
  };

  const naturalSize = loadedImage?.src === src ? loadedImage.size : null;
  const intrinsicLimit = naturalSize
    ? {
        maxHeight: `${naturalSize.height}px`,
        maxWidth: `${naturalSize.width}px`,
      }
    : undefined;

  return (
    <div className={cn("absolute inset-0 isolate overflow-hidden bg-[#07080a]", className)}>
      <ProjectImage
        aria-hidden="true"
        alt=""
        className="pointer-events-none z-0 scale-[1.12] select-none object-cover brightness-[0.68] saturate-[0.78] blur-xl"
        draggable={false}
        fill
        loading={preload ? "eager" : undefined}
        sizes={sizes}
        src={src}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08)_15%,rgba(0,0,0,0.18)_100%)]" />
      <ProjectImage
        alt={alt}
        className="pointer-events-none z-20 m-auto select-none object-contain"
        draggable={false}
        fill
        onLoad={handleLoad}
        preload={preload}
        sizes={sizes}
        src={src}
        style={intrinsicLimit}
      />
    </div>
  );
}

type ZoomGesture = {
  pointers: Map<number, Point>;
  startCenter: Point;
  startDistance: number;
  startPan: Point;
  startPoint: Point;
  startZoom: number;
};

function ZoomableImage({
  activeIndex,
  image,
  onNavigate,
  title,
}: {
  activeIndex: number;
  image: string;
  onNavigate: (direction: -1 | 1) => void;
  title: string;
}) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = React.useState<NaturalSize | null>(null);
  const [isGesturing, setIsGesturing] = React.useState(false);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(MIN_ZOOM);
  const panRef = React.useRef(pan);
  const zoomRef = React.useRef(zoom);
  const gestureRef = React.useRef<ZoomGesture>({
    pointers: new Map(),
    startCenter: { x: 0, y: 0 },
    startDistance: 0,
    startPan: { x: 0, y: 0 },
    startPoint: { x: 0, y: 0 },
    startZoom: MIN_ZOOM,
  });

  React.useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  React.useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const constrainPan = React.useCallback(
    (nextPan: Point, nextZoom: number) => {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport || !naturalSize) return nextPan;

      const fittedScale = Math.min(
        viewport.width / naturalSize.width,
        viewport.height / naturalSize.height,
        1
      );
      const displayedWidth = naturalSize.width * fittedScale * nextZoom;
      const displayedHeight = naturalSize.height * fittedScale * nextZoom;
      const maximumX = Math.max(0, (displayedWidth - viewport.width) / 2);
      const maximumY = Math.max(0, (displayedHeight - viewport.height) / 2);

      return {
        x: clamp(nextPan.x, -maximumX, maximumX),
        y: clamp(nextPan.y, -maximumY, maximumY),
      };
    },
    [naturalSize]
  );

  const changeZoom = React.useCallback(
    (nextZoom: number) => {
      const constrainedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      setZoom(constrainedZoom);
      setPan((current) => constrainPan(current, constrainedZoom));
    },
    [constrainPan]
  );

  const resetZoom = React.useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  React.useEffect(() => {
    const handleResize = () => setPan((current) => constrainPan(current, zoomRef.current));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [constrainPan]);

  const beginPointerGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const gesture = gestureRef.current;
    const point = { x: event.clientX, y: event.clientY };
    gesture.pointers.set(event.pointerId, point);
    setIsGesturing(true);

    if (gesture.pointers.size === 1) {
      gesture.startPoint = point;
      gesture.startPan = panRef.current;
      gesture.startZoom = zoomRef.current;
    } else if (gesture.pointers.size === 2) {
      const [first, second] = Array.from(gesture.pointers.values());
      gesture.startDistance = distance(first, second);
      gesture.startCenter = midpoint(first, second);
      gesture.startPan = panRef.current;
      gesture.startZoom = zoomRef.current;
    }
  };

  const movePointerGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (gesture.pointers.size === 2) {
      const [first, second] = Array.from(gesture.pointers.values());
      const nextDistance = distance(first, second);
      const nextCenter = midpoint(first, second);
      const nextZoom = clamp(
        gesture.startZoom * (nextDistance / Math.max(gesture.startDistance, 1)),
        MIN_ZOOM,
        MAX_ZOOM
      );
      const nextPan = constrainPan(
        {
          x: gesture.startPan.x + nextCenter.x - gesture.startCenter.x,
          y: gesture.startPan.y + nextCenter.y - gesture.startCenter.y,
        },
        nextZoom
      );
      setZoom(nextZoom);
      setPan(nextPan);
      return;
    }

    if (gesture.pointers.size === 1) {
      const [point] = Array.from(gesture.pointers.values());
      const delta = {
        x: point.x - gesture.startPoint.x,
        y: point.y - gesture.startPoint.y,
      };
      if (zoomRef.current > MIN_ZOOM) {
        setPan(
          constrainPan(
            { x: gesture.startPan.x + delta.x, y: gesture.startPan.y + delta.y },
            zoomRef.current
          )
        );
      }
    }
  };

  const endPointerGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    const point = gesture.pointers.get(event.pointerId);
    const wasPinching = gesture.pointers.size > 1;
    gesture.pointers.delete(event.pointerId);
    if (!gesture.pointers.size) setIsGesturing(false);

    if (!wasPinching && point && zoomRef.current === MIN_ZOOM) {
      const deltaX = point.x - gesture.startPoint.x;
      const deltaY = point.y - gesture.startPoint.y;
      if (Math.abs(deltaX) > 54 && Math.abs(deltaX) > Math.abs(deltaY)) {
        onNavigate(deltaX > 0 ? -1 : 1);
      }
    }

    if (gesture.pointers.size === 1) {
      const [remainingPoint] = Array.from(gesture.pointers.values());
      gesture.startPoint = remainingPoint;
      gesture.startPan = panRef.current;
      gesture.startZoom = zoomRef.current;
    }
  };

  return (
    <>
      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden rounded-2xl bg-black/70 sm:rounded-3xl",
          zoom > MIN_ZOOM ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
        onPointerCancel={(event) => {
          gestureRef.current.pointers.delete(event.pointerId);
          if (!gestureRef.current.pointers.size) setIsGesturing(false);
        }}
        onPointerDown={beginPointerGesture}
        onPointerMove={movePointerGesture}
        onPointerUp={endPointerGesture}
        onWheel={(event) => {
          event.preventDefault();
          changeZoom(zoomRef.current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
        }}
      >
        <div
          className="pg-zoom-layer absolute inset-0 will-change-transform"
          data-gesturing={isGesturing ? "true" : "false"}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          <GalleryImage
            alt={`Foto ${activeIndex + 1} ampliada do projeto ${title}`}
            onNaturalSize={setNaturalSize}
            sizes="100vw"
            src={image}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 pt-2 sm:pt-3">
        <Button
          aria-label="Diminuir zoom"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => changeZoom(zoom - ZOOM_STEP)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="min-w-14 text-center text-xs font-semibold text-muted" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          aria-label="Aumentar zoom"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => changeZoom(zoom + ZOOM_STEP)}
          size="icon"
          type="button"
          variant="outline"
        >
          <ZoomIn className="size-4" />
        </Button>
        <Button
          aria-label="Restaurar zoom"
          disabled={zoom === MIN_ZOOM && pan.x === 0 && pan.y === 0}
          onClick={resetZoom}
          size="icon"
          type="button"
          variant="outline"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </>
  );
}

export function ProjectGallery({
  className,
  images,
  overlay,
  title,
}: {
  className?: string;
  images: string[];
  overlay?: React.ReactNode;
  title: string;
}) {
  const reducedMotion = useReducedMotion();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const expandButtonRef = React.useRef<HTMLButtonElement>(null);
  const dragRef = React.useRef({ pointerId: -1, startX: 0, startY: 0 });
  const suppressedClickRef = React.useRef(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [autoplayRevision, setAutoplayRevision] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isInteracting, setIsInteracting] = React.useState(false);
  const [isPageVisible, setIsPageVisible] = React.useState(true);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const hasMultipleImages = images.length > 1;

  React.useEffect(() => {
    const updateVisibility = () => setIsPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  React.useEffect(() => {
    if (!lightboxOpen) return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [lightboxOpen]);

  const selectImage = React.useCallback(
    (nextIndex: number, manual = true) => {
      if (!images.length) return;
      setSelectedIndex((nextIndex + images.length) % images.length);
      if (manual) setAutoplayRevision((current) => current + 1);
    },
    [images.length]
  );

  const navigate = React.useCallback(
    (direction: -1 | 1, manual = true) => {
      setSelectedIndex((current) => {
        if (!images.length) return 0;
        return (current + direction + images.length) % images.length;
      });
      if (manual) setAutoplayRevision((current) => current + 1);
    },
    [images.length]
  );

  React.useEffect(() => {
    if (
      !hasMultipleImages ||
      reducedMotion ||
      !isPageVisible ||
      isInteracting ||
      lightboxOpen
    ) {
      return;
    }

    const timer = window.setTimeout(() => navigate(1, false), AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    selectedIndex,
    autoplayRevision,
    hasMultipleImages,
    isInteracting,
    isPageVisible,
    lightboxOpen,
    navigate,
    reducedMotion,
  ]);

  if (!images.length) {
    return (
      <div
        className={cn(
          "flex h-full min-h-64 flex-col justify-center rounded-3xl border border-border/70 bg-background/25 p-6 text-sm text-muted sm:rounded-4xl",
          className
        )}
      >
        <Images className="mb-3 size-8 text-accent" />
        Este projeto ainda não tem fotos publicadas. Quando o dono adicionar imagens, a
        galeria aparece aqui.
      </div>
    );
  }

  const activeIndex = Math.min(selectedIndex, images.length - 1);
  const activeImage = images[activeIndex];

  return (
    <>
      <div
        aria-label={`Galeria de fotos do projeto ${title}`}
        aria-roledescription="carousel"
        role="region"
        className={cn(
          "group/gallery relative h-full min-h-64 overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-elevated sm:rounded-4xl",
          className
        )}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false);
        }}
        onFocusCapture={() => setIsInteracting(true)}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
      >
        <button
          aria-label={`Ampliar foto ${activeIndex + 1} de ${images.length}`}
          className="absolute inset-0 z-10 touch-pan-y cursor-zoom-in overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70"
          ref={expandButtonRef}
          onClick={() => {
            if (suppressedClickRef.current) {
              suppressedClickRef.current = false;
              return;
            }
            setLightboxOpen(true);
          }}
          onPointerCancel={() => {
            dragRef.current.pointerId = -1;
            setDragOffset(0);
            setIsInteracting(false);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsInteracting(true);
          }}
          onPointerMove={(event) => {
            if (dragRef.current.pointerId !== event.pointerId || !hasMultipleImages) return;
            const offset = event.clientX - dragRef.current.startX;
            if (Math.abs(offset) > 4) suppressedClickRef.current = true;
            setDragOffset(offset);
          }}
          onPointerUp={(event) => {
            if (dragRef.current.pointerId !== event.pointerId) return;
            const deltaX = event.clientX - dragRef.current.startX;
            const deltaY = event.clientY - dragRef.current.startY;
            dragRef.current.pointerId = -1;
            setDragOffset(0);
            setIsInteracting(false);
            if (
              hasMultipleImages &&
              Math.abs(deltaX) > 48 &&
              Math.abs(deltaX) > Math.abs(deltaY)
            ) {
              navigate(deltaX > 0 ? -1 : 1);
            }
            window.setTimeout(() => {
              suppressedClickRef.current = false;
            }, 0);
          }}
          type="button"
        >
          <div
            className="pg-gallery-slide absolute inset-0"
            key={`${activeImage}-${activeIndex}`}
            style={{
              transform: dragOffset ? `translate3d(${dragOffset}px, 0, 0)` : undefined,
              transition: dragOffset ? "none" : undefined,
            }}
          >
            <GalleryImage
              alt={`Foto ${activeIndex + 1} do projeto ${title}`}
              preload={activeIndex === 0}
              sizes="(min-width: 1024px) 42vw, 100vw"
              src={activeImage}
            />
          </div>
        </button>

        {overlay ? <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">{overlay}</div> : null}

        {hasMultipleImages ? (
          <>
            <Button
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 z-30 hidden size-11 -translate-y-1/2 bg-background/75 opacity-0 backdrop-blur-md group-hover/gallery:opacity-100 group-focus-within/gallery:opacity-100 sm:inline-flex"
              onClick={() => navigate(-1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 z-30 hidden size-11 -translate-y-1/2 bg-background/75 opacity-0 backdrop-blur-md group-hover/gallery:opacity-100 group-focus-within/gallery:opacity-100 sm:inline-flex"
              onClick={() => navigate(1)}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight className="size-5" />
            </Button>

            <div className="absolute bottom-3 right-3 z-30 flex max-w-[55%] items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-background/75 px-2.5 py-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:bottom-5 md:right-5">
              {images.map((image, index) => (
                <button
                  aria-label={`Mostrar foto ${index + 1} de ${images.length}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className="flex size-4 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  key={`${image}-${index}`}
                  onClick={() => selectImage(index)}
                  type="button"
                >
                  <span
                    className={cn(
                      "block rounded-full transition-all",
                      index === activeIndex
                        ? "h-1.5 w-3.5 bg-accent"
                        : "size-1.5 bg-white/55 hover:bg-white/85"
                    )}
                  />
                </button>
              ))}
              <span className="ml-1 whitespace-nowrap text-[10px] font-semibold text-white/85">
                {activeIndex + 1} / {images.length}
              </span>
            </div>
          </>
        ) : null}

        <span className="sr-only" aria-live="polite">
          Foto {activeIndex + 1} de {images.length}
        </span>
      </div>

      <Dialog.Root modal={false} open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="pg-lightbox-overlay fixed inset-0 z-[80] bg-black/90 backdrop-blur-md"
            onClick={() => setLightboxOpen(false)}
          />
          <Dialog.Content
            aria-modal="true"
            aria-describedby={undefined}
            className="pg-lightbox-content fixed inset-y-2 left-1/2 z-[90] flex w-[calc(100%-1rem)] max-w-7xl -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c0f] p-2 shadow-2xl outline-none sm:inset-y-4 sm:w-[calc(100%-2rem)] sm:rounded-4xl sm:p-3"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                const focusable = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                  )
                );
                if (focusable.length) {
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                  }
                }
                return;
              }
              if (!hasMultipleImages) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                navigate(-1);
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                navigate(1);
              }
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              expandButtonRef.current?.focus();
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              closeButtonRef.current?.focus();
            }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-2 sm:px-2 sm:pb-3">
              <div className="min-w-0">
                <Dialog.Title className="truncate font-title text-sm font-semibold sm:text-base">
                  {title}
                </Dialog.Title>
                <p className="mt-0.5 text-xs text-muted">
                  {activeIndex + 1} / {images.length}
                </p>
              </div>
              <Dialog.Close asChild>
                <Button
                  aria-label="Fechar visualização ampliada"
                  ref={closeButtonRef}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            <ZoomableImage
              activeIndex={activeIndex}
              image={activeImage}
              key={`${activeImage}-${activeIndex}`}
              onNavigate={navigate}
              title={title}
            />

            {hasMultipleImages ? (
              <>
                <Button
                  aria-label="Foto anterior"
                  className="absolute left-4 top-1/2 z-20 size-10 -translate-y-1/2 bg-background/75 backdrop-blur-md sm:left-6 sm:size-11"
                  onClick={() => navigate(-1)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  aria-label="Próxima foto"
                  className="absolute right-4 top-1/2 z-20 size-10 -translate-y-1/2 bg-background/75 backdrop-blur-md sm:right-6 sm:size-11"
                  onClick={() => navigate(1)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
