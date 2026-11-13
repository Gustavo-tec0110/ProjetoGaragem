"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { getProfileImageLayout } from "@/lib/profile/image-crop";

export type PhotoCrop = { zoom: number; x: number; y: number };
export const DEFAULT_PHOTO_CROP: PhotoCrop = { zoom: 1, x: 0, y: 0 };

/** The same square viewport is used by the editor and all cover thumbnails. */
export function ModificationCover({ src, crop, alt = "" }: { src: string; crop?: PhotoCrop | null; alt?: string }) {
  const value = crop ?? DEFAULT_PHOTO_CROP;
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null);
  const layout = size ? getProfileImageLayout(size, { width: 1, height: 1 }, value.zoom, { x: value.x, y: value.y }) : null;
  return <div className="absolute left-1/2 top-1/2 aspect-square h-full max-w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden">
    <img src={src} alt={alt} draggable={false} onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="absolute max-w-none" style={layout ? { width: `${layout.width * 100}%`, height: `${layout.height * 100}%`, left: `${layout.left * 100}%`, top: `${layout.top * 100}%` } : { width: "100%", height: "100%", objectFit: "cover" }} />
  </div>;
}

export function ModificationCropDialog({ src, initial, onCancel, onSave }: { src: string; initial: PhotoCrop | null; onCancel: () => void; onSave: (crop: PhotoCrop) => void }) {
  const [crop, setCrop] = React.useState<PhotoCrop>(initial ?? DEFAULT_PHOTO_CROP);
  const [size, setSize] = React.useState<{ width: number; height: number } | null>(null);
  const zoomInput = React.useRef<HTMLInputElement>(null);
  const gesture = React.useRef<{ id: number; x: number; y: number; crop: PhotoCrop; width: number } | null>(null);
  const clamp = (next: PhotoCrop) => {
    if (!size) return next;
    const layout = getProfileImageLayout(size, { width: 1, height: 1 }, next.zoom, { x: next.x, y: next.y });
    return { zoom: layout.zoom, x: layout.position.x, y: layout.position.y };
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/80" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-[110] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl">
      <Dialog.Title className="font-title text-xl">Ajustar capa</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-muted">Arraste a foto e ajuste o zoom. O quadrado mostra o recorte salvo.</Dialog.Description>
      <div className="relative mx-auto mt-4 aspect-square w-full max-w-72 touch-none cursor-move overflow-hidden rounded-xl bg-black" onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, crop, width: event.currentTarget.clientWidth };
      }} onPointerMove={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        setCrop(clamp({ ...start.crop, x: start.crop.x + (event.clientX - start.x) / start.width, y: start.crop.y + (event.clientY - start.y) / start.width }));
      }} onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }}>
        <ModificationCover src={src} crop={crop} alt="Prévia do recorte" />
        <img src={src} alt="" className="hidden" onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
      </div>
      <label className="mt-4 block text-sm font-medium">Zoom <input ref={zoomInput} className="mt-2 w-full" type="range" min="1" max="4" step="0.01" value={crop.zoom} onInput={(event) => setCrop(clamp({ ...crop, zoom: event.currentTarget.valueAsNumber }))} /></label>
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="button" disabled={!size} onClick={() => onSave(clamp({ ...crop, zoom: zoomInput.current?.valueAsNumber ?? crop.zoom }))}>Salvar recorte</Button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
