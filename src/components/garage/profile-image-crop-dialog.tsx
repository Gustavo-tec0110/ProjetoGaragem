"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ImagePlus, LoaderCircle, Minus, Move, Plus, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getProfileImageLayout,
  PROFILE_CROP_MAX_ZOOM,
  PROFILE_CROP_MIN_ZOOM,
  PROFILE_CROP_OUTPUT_SIZES,
  PROFILE_CROP_ZOOM_STEP,
  type CropPoint,
  type CropSize,
  type ProfileCropKind,
  zoomProfileImageAtPoint,
} from "@/lib/profile/image-crop";
import { cn } from "@/lib/utils";

type PointerGesture = {
  points: Map<number, CropPoint>;
  startPosition: CropPoint;
  startZoom: number;
  startCenter: CropPoint;
  startDistance: number;
};

function distance(a: CropPoint, b: CropPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: CropPoint, b: CropPoint) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function localPoint(element: HTMLElement, point: CropPoint) {
  const bounds = element.getBoundingClientRect();
  return { x: point.x - bounds.left, y: point.y - bounds.top };
}

export function ProfileImageCropDialog({ file, selectionKey, kind, onReplace, onCancel, onApply }: {
  file: File | null;
  selectionKey: number;
  kind: ProfileCropKind;
  onReplace: (file: File) => string | null;
  onCancel: () => void;
  onApply: (croppedFile: File) => Promise<void>;
}) {
  if (!file) return null;
  return (
    <ProfileImageCropEditor
      key={selectionKey}
      file={file}
      kind={kind}
      onReplace={onReplace}
      onCancel={onCancel}
      onApply={onApply}
    />
  );
}

function ProfileImageCropEditor({ file, kind, onReplace, onCancel, onApply }: {
  file: File;
  kind: ProfileCropKind;
  onReplace: (file: File) => string | null;
  onCancel: () => void;
  onApply: (croppedFile: File) => Promise<void>;
}) {
  const cropRef = React.useRef<HTMLDivElement | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null);
  const cropCleanupRef = React.useRef<() => void>(() => undefined);
  const gestureRef = React.useRef<PointerGesture | null>(null);
  const stateRef = React.useRef({ zoom: PROFILE_CROP_MIN_ZOOM, position: { x: 0, y: 0 } });
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [imageSize, setImageSize] = React.useState<CropSize | null>(null);
  const [cropSize, setCropSize] = React.useState<CropSize | null>(null);
  const [position, setPositionState] = React.useState<CropPoint>({ x: 0, y: 0 });
  const [zoom, setZoomState] = React.useState(PROFILE_CROP_MIN_ZOOM);
  const [gesturing, setGesturing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const isAvatar = kind === "avatar";
  const interactionRef = React.useRef({ imageSize, cropSize, saving });

  const commitTransform = React.useCallback((nextZoom: number, nextPosition: CropPoint) => {
    stateRef.current = { zoom: nextZoom, position: nextPosition };
    setZoomState(nextZoom);
    setPositionState(nextPosition);
  }, []);

  React.useEffect(() => {
    interactionRef.current = { imageSize, cropSize, saving };
  }, [cropSize, imageSize, saving]);

  const setCropNode = React.useCallback((element: HTMLDivElement | null) => {
    cropCleanupRef.current();
    cropRef.current = element;
    if (!element) return;

    const frame = window.requestAnimationFrame(() => {
      if (cropRef.current !== element) return;
      const updateSize = () => {
        const bounds = element.getBoundingClientRect();
        if (bounds.width > 0 && bounds.height > 0) {
          setCropSize({ width: bounds.width, height: bounds.height });
        }
      };
      const observer = new ResizeObserver(updateSize);
      const handleNativeWheel = (event: WheelEvent) => {
        const currentInteraction = interactionRef.current;
        if (!currentInteraction.imageSize || !currentInteraction.cropSize || currentInteraction.saving) return;
        event.preventDefault();
        const bounds = element.getBoundingClientRect();
        const current = stateRef.current;
        const next = zoomProfileImageAtPoint(
          currentInteraction.imageSize,
          currentInteraction.cropSize,
          current.zoom,
          current.position,
          current.zoom * Math.exp(-event.deltaY * 0.0015),
          { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
        );
        commitTransform(next.zoom, next.position);
      };
      observer.observe(element);
      element.addEventListener("wheel", handleNativeWheel, { passive: false });
      updateSize();
      cropCleanupRef.current = () => {
        observer.disconnect();
        element.removeEventListener("wheel", handleNativeWheel);
      };
    });
    cropCleanupRef.current = () => window.cancelAnimationFrame(frame);
  }, [commitTransform]);

  React.useEffect(() => () => cropCleanupRef.current(), []);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    let cancelled = false;
    const image = new Image();
    image.src = url;
    void image.decode().then(() => {
      if (cancelled) return;
      setPreviewUrl(url);
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      setError("");
    }).catch(() => {
      if (!cancelled) setError("Não foi possível ler esta imagem. Escolha outro arquivo.");
    });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const layout = imageSize && cropSize
    ? getProfileImageLayout(imageSize, cropSize, zoom, position)
    : null;

  function reset() {
    commitTransform(PROFILE_CROP_MIN_ZOOM, { x: 0, y: 0 });
    setError("");
  }

  function updateZoom(nextZoom: number, anchor?: CropPoint) {
    if (!imageSize || !cropSize) return;
    const current = stateRef.current;
    const next = zoomProfileImageAtPoint(
      imageSize,
      cropSize,
      current.zoom,
      current.position,
      nextZoom,
      anchor
    );
    commitTransform(next.zoom, next.position);
  }

  function restartGesture(points: Map<number, CropPoint>) {
    const values = [...points.values()];
    const current = stateRef.current;
    gestureRef.current = {
      points,
      startPosition: current.position,
      startZoom: current.zoom,
      startCenter: values.length > 1 ? midpoint(values[0], values[1]) : values[0],
      startDistance: values.length > 1 ? Math.max(1, distance(values[0], values[1])) : 0,
    };
  }

  function startGesture(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropSize || !imageSize || saving) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const currentPoints = gestureRef.current?.points ?? new Map<number, CropPoint>();
    const points = new Map(currentPoints);
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    restartGesture(points);
    setGesturing(true);
  }

  function moveGesture(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || !gesture.points.has(event.pointerId) || !imageSize || !cropSize) return;
    event.preventDefault();
    const points = new Map(gesture.points);
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.points = points;
    const values = [...points.values()];

    if (values.length === 1) {
      const delta = {
        x: (values[0].x - gesture.startCenter.x) / cropSize.width,
        y: (values[0].y - gesture.startCenter.y) / cropSize.height,
      };
      const next = getProfileImageLayout(imageSize, cropSize, gesture.startZoom, {
        x: gesture.startPosition.x + delta.x,
        y: gesture.startPosition.y + delta.y,
      });
      commitTransform(next.zoom, next.position);
      return;
    }

    const center = midpoint(values[0], values[1]);
    const nextZoom = gesture.startZoom * (distance(values[0], values[1]) / gesture.startDistance);
    const anchored = zoomProfileImageAtPoint(
      imageSize,
      cropSize,
      gesture.startZoom,
      gesture.startPosition,
      nextZoom,
      localPoint(event.currentTarget, gesture.startCenter)
    );
    const translated = getProfileImageLayout(imageSize, cropSize, anchored.zoom, {
      x: anchored.position.x + (center.x - gesture.startCenter.x) / cropSize.width,
      y: anchored.position.y + (center.y - gesture.startCenter.y) / cropSize.height,
    });
    commitTransform(translated.zoom, translated.position);
  }

  function finishGesture(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture?.points.has(event.pointerId)) return;
    const points = new Map(gesture.points);
    points.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (points.size) restartGesture(points);
    else {
      gestureRef.current = null;
      setGesturing(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!imageSize || !cropSize || saving) return;
    const panStep = event.shiftKey ? 0.1 : 0.025;
    const current = stateRef.current;
    const movement: Record<string, CropPoint> = {
      ArrowLeft: { x: -panStep, y: 0 },
      ArrowRight: { x: panStep, y: 0 },
      ArrowUp: { x: 0, y: -panStep },
      ArrowDown: { x: 0, y: panStep },
    };
    if (movement[event.key]) {
      event.preventDefault();
      const delta = movement[event.key];
      const next = getProfileImageLayout(imageSize, cropSize, current.zoom, {
        x: current.position.x + delta.x,
        y: current.position.y + delta.y,
      });
      commitTransform(next.zoom, next.position);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateZoom(current.zoom + PROFILE_CROP_ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      updateZoom(current.zoom - PROFILE_CROP_ZOOM_STEP);
    } else if (event.key === "0" || event.key === "Home") {
      event.preventDefault();
      reset();
    }
  }

  async function createCroppedFile() {
    if (!imageSize || !previewUrl) throw new Error("Não foi possível preparar o recorte.");
    const image = new Image();
    image.src = previewUrl;
    await image.decode();

    const output = PROFILE_CROP_OUTPUT_SIZES[kind];
    const outputLayout = getProfileImageLayout(imageSize, output, zoom, position);
    const canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar o recorte.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, outputLayout.left, outputLayout.top, outputLayout.width, outputLayout.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) throw new Error("Não foi possível preparar o recorte.");
    return new File([blob], kind === "avatar" ? "avatar.webp" : "capa.webp", { type: "image/webp" });
  }

  async function apply() {
    setSaving(true);
    setError("");
    try {
      await onApply(await createCroppedFile());
      onCancel();
    } catch {
      setError("Não foi possível aplicar o recorte. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const zoomPercent = Math.round(zoom * 100);
  const canZoomOut = zoom > PROFILE_CROP_MIN_ZOOM + 0.001;
  const canZoomIn = zoom < PROFILE_CROP_MAX_ZOOM - 0.001;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !saving && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[110] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-title text-xl tracking-tight sm:text-2xl">Ajustar {isAvatar ? "foto de perfil" : "imagem de capa"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Arraste para posicionar. Use a roda do mouse ou dois dedos para ampliar.</Dialog.Description>
              {!isAvatar ? <p className="mt-1 text-xs text-muted">No cabeçalho do perfil, a capa pode receber um corte adicional conforme a largura da tela.</p> : null}
            </div>
            <Dialog.Close asChild>
              <Button type="button" size="icon" variant="ghost" className="size-10 shrink-0" disabled={saving} aria-label="Cancelar recorte"><X className="size-5" /></Button>
            </Dialog.Close>
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-2 sm:p-3">
            <div
              ref={setCropNode}
              data-testid={`profile-${kind}-crop-area`}
              data-zoom={zoom.toFixed(3)}
              data-position-x={position.x.toFixed(4)}
              data-position-y={position.y.toFixed(4)}
              data-gesturing={gesturing}
              data-preview-ready={Boolean(previewUrl)}
              data-image-width={imageSize?.width ?? 0}
              role="application"
              tabIndex={0}
              className={cn(
                "relative w-full touch-none select-none overflow-hidden bg-black shadow-inner outline-none ring-accent/70 focus-visible:ring-2",
                gesturing ? "cursor-grabbing" : "cursor-grab",
                isAvatar ? "mx-auto aspect-square max-w-[min(74vw,23rem)] rounded-xl" : "aspect-[3/1] rounded-xl"
              )}
              onPointerDown={startGesture}
              onPointerMove={moveGesture}
              onPointerUp={finishGesture}
              onPointerCancel={finishGesture}
              onKeyDown={handleKeyDown}
              aria-label="Área de recorte. Arraste para reposicionar; use mais e menos para alterar o zoom e as setas para mover."
            >
              {layout ? (
                <img src={previewUrl} alt="Prévia do recorte" draggable={false} className="pointer-events-none absolute max-w-none will-change-[width,height,left,top]" style={{ width: layout.width, height: layout.height, left: layout.left, top: layout.top }} />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted"><LoaderCircle className="size-6 animate-spin" aria-hidden="true" /><span className="sr-only">Preparando imagem</span></div>
              )}
              {isAvatar ? (
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                  <div className="absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.48)]" />
                  <div className="absolute inset-1/3 rounded-full border border-white/20" />
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-0 border border-white/75" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/3 border-l border-white/20" />
                  <span className="absolute inset-y-0 right-1/3 border-r border-white/20" />
                  <span className="absolute inset-x-0 top-1/2 border-t border-white/20" />
                </div>
              )}
              <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm" aria-hidden="true"><Move className="size-3.5" /> Arraste para posicionar</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border/70 bg-background/35 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <label htmlFor={`profile-${kind}-zoom`} className="font-medium text-foreground">Zoom</label>
              <output htmlFor={`profile-${kind}-zoom`} className="min-w-14 rounded-full bg-surface px-2.5 py-1 text-center tabular-nums text-muted" aria-live="polite">{zoomPercent}%</output>
            </div>
            <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-3">
              <Button type="button" size="icon" variant="outline" className="size-11 rounded-full" onClick={() => updateZoom(zoom - PROFILE_CROP_ZOOM_STEP)} disabled={saving || !imageSize || !canZoomOut} aria-label="Diminuir zoom"><Minus className="size-4" /></Button>
              <input
                id={`profile-${kind}-zoom`}
                data-testid={`profile-${kind}-zoom`}
                type="range"
                min={PROFILE_CROP_MIN_ZOOM}
                max={PROFILE_CROP_MAX_ZOOM}
                step="0.01"
                value={zoom}
                onChange={(event) => updateZoom(Number(event.target.value))}
                disabled={saving || !imageSize}
                className="pg-crop-range w-full cursor-pointer disabled:cursor-not-allowed"
                style={{ "--pg-range-progress": `${((zoom - PROFILE_CROP_MIN_ZOOM) / (PROFILE_CROP_MAX_ZOOM - PROFILE_CROP_MIN_ZOOM)) * 100}%` } as React.CSSProperties}
                aria-valuetext={`${zoomPercent}%`}
              />
              <Button type="button" size="icon" variant="outline" className="size-11 rounded-full" onClick={() => updateZoom(zoom + PROFILE_CROP_ZOOM_STEP)} disabled={saving || !imageSize || !canZoomIn} aria-label="Aumentar zoom"><Plus className="size-4" /></Button>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}

          <input
            ref={replaceInputRef}
            data-testid={`profile-${kind}-replace-input`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0];
              if (nextFile) {
                const replacementError = onReplace(nextFile);
                if (replacementError) setError(replacementError);
              }
              event.currentTarget.value = "";
            }}
          />

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="ghost" onClick={() => replaceInputRef.current?.click()} disabled={saving}><ImagePlus className="size-4" /> Trocar imagem</Button>
              <Button type="button" variant="ghost" onClick={reset} disabled={saving || !imageSize || (zoom === PROFILE_CROP_MIN_ZOOM && position.x === 0 && position.y === 0)}><RotateCcw className="size-4" /> Redefinir</Button>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
              <Button type="button" onClick={() => void apply()} disabled={saving || !imageSize || Boolean(error)}>
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                {saving ? "Aplicando..." : "Aplicar recorte"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
