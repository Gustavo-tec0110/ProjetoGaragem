"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CropKind = "avatar" | "cover";
type Point = { x: number; y: number };
type CropSize = { width: number; height: number };

const outputSizes: Record<CropKind, CropSize> = {
  avatar: { width: 512, height: 512 },
  cover: { width: 1500, height: 500 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function imageLayout(image: CropSize, crop: CropSize, zoom: number, position: Point) {
  const baseScale = Math.max(crop.width / image.width, crop.height / image.height);
  const width = image.width * baseScale * zoom;
  const height = image.height * baseScale * zoom;
  const maxX = Math.max(0, (width - crop.width) / (2 * crop.width));
  const maxY = Math.max(0, (height - crop.height) / (2 * crop.height));
  const safePosition = {
    x: clamp(position.x, -maxX, maxX),
    y: clamp(position.y, -maxY, maxY),
  };

  return {
    width,
    height,
    left: (crop.width - width) / 2 + safePosition.x * crop.width,
    top: (crop.height - height) / 2 + safePosition.y * crop.height,
    position: safePosition,
  };
}

export function ProfileImageCropDialog({
  file,
  kind,
  onCancel,
  onApply,
}: {
  file: File | null;
  kind: CropKind;
  onCancel: () => void;
  onApply: (croppedFile: File) => Promise<void>;
}) {
  if (!file) return null;
  return <ProfileImageCropEditor key={`${file.name}-${file.lastModified}-${file.size}`} file={file} kind={kind} onCancel={onCancel} onApply={onApply} />;
}

function ProfileImageCropEditor({
  file,
  kind,
  onCancel,
  onApply,
}: {
  file: File;
  kind: CropKind;
  onCancel: () => void;
  onApply: (croppedFile: File) => Promise<void>;
}) {
  const cropRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ pointerId: number; start: Point; position: Point } | null>(null);
  const [previewUrl] = React.useState(() => URL.createObjectURL(file));
  const [imageSize, setImageSize] = React.useState<CropSize | null>(null);
  const [cropSize, setCropSize] = React.useState<CropSize | null>(null);
  const [position, setPosition] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const isAvatar = kind === "avatar";

  React.useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  React.useEffect(() => {
    const element = cropRef.current;
    if (!element) return;
    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      setCropSize({ width: bounds.width, height: bounds.height });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    const frame = window.requestAnimationFrame(updateSize);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const layout = imageSize && cropSize ? imageLayout(imageSize, cropSize, zoom, position) : null;

  function updateZoom(nextZoom: number) {
    const next = clamp(nextZoom, 1, 3);
    setZoom(next);
    if (imageSize && cropSize) {
      setPosition(imageLayout(imageSize, cropSize, next, position).position);
    }
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropSize || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      position,
    };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !imageSize || !cropSize) return;
    const nextPosition = {
      x: drag.position.x + (event.clientX - drag.start.x) / cropSize.width,
      y: drag.position.y + (event.clientY - drag.start.y) / cropSize.height,
    };
    setPosition(imageLayout(imageSize, cropSize, zoom, nextPosition).position);
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  async function createCroppedFile() {
    if (!imageSize || !cropSize) throw new Error("Não foi possível preparar o recorte.");
    const image = new Image();
    image.src = previewUrl;
    await image.decode();

    const output = outputSizes[kind];
    const layoutForOutput = imageLayout(imageSize, output, zoom, position);
    const canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar o recorte.");

    context.drawImage(image, layoutForOutput.left, layoutForOutput.top, layoutForOutput.width, layoutForOutput.height);
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

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !saving && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[110] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-title text-xl tracking-tight sm:text-2xl">Ajustar {isAvatar ? "foto de perfil" : "imagem de capa"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">Arraste a imagem e ajuste o zoom antes de enviar.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" size="icon" variant="ghost" className="size-10 shrink-0" disabled={saving} aria-label="Cancelar recorte"><X className="size-5" /></Button>
            </Dialog.Close>
          </div>

          <div
            ref={cropRef}
            className={cn(
              "relative mt-5 w-full touch-none select-none overflow-hidden rounded-2xl bg-black shadow-inner",
              isAvatar ? "mx-auto max-w-[min(76vw,22rem)] aspect-square rounded-full" : "aspect-[3/1]"
            )}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            aria-label="Área de recorte. Arraste para reposicionar a imagem."
          >
            {layout ? (
              <img
                src={previewUrl}
                alt="Prévia do recorte"
                draggable={false}
                onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                className="pointer-events-none absolute max-w-none"
                style={{ width: layout.width, height: layout.height, left: layout.left, top: layout.top }}
              />
            ) : (
              <img src={previewUrl} alt="Carregando prévia" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="absolute inset-0 size-full object-cover" />
            )}
            {isAvatar ? <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" aria-hidden="true" /> : null}
          </div>

          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between text-sm text-muted"><label htmlFor={`profile-${kind}-zoom`}>Zoom</label><span>{Math.round(zoom * 100)}%</span></div>
            <input id={`profile-${kind}-zoom`} type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} disabled={saving} className="accent-red-500" />
          </div>

          {error ? <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => { setPosition({ x: 0, y: 0 }); setZoom(1); }} disabled={saving}><RotateCcw className="size-4" />Redefinir</Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="button" onClick={() => void apply()} disabled={saving || !imageSize}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : null}{saving ? "Aplicando..." : "Aplicar recorte"}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
