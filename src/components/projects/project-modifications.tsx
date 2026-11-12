"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import {
  Camera,
  Star,
  ChevronLeft,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import {
  createProjectModification,
  deleteProjectModification,
  updateProjectModification,
} from "@/app/projeto/[slug]/modificacoes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CatalogDetails, CatalogDetailsProvider } from "@/components/projects/catalog-details";
import { CatalogPicker } from "@/components/projects/catalog-picker";
import { ProjectImage } from "@/components/projects/project-image";
import { ModificationCover, ModificationCropDialog, type PhotoCrop } from "@/components/projects/modification-photo";
import { projectImagePathFromUrl, projectImageUrl } from "@/lib/images/project-image-url";
import { cn } from "@/lib/utils";
import type {
  ModificationCatalogItem,
  ProjectModification,
} from "@/lib/modifications/types";
import type { ModificationCategoryRow, ProjectModificationStatus } from "@/lib/types";

type Props = {
  carId: string | null;
  projectName: string;
  projectHref: string;
  canEdit: boolean;
  categories: ModificationCategoryRow[];
  catalog: ModificationCatalogItem[];
  modifications: ProjectModification[];
};

type Draft = {
  catalogId: string;
  specialName: string;
  special: boolean;
  status: ProjectModificationStatus;
  paidAmount: number | null;
  note: string;
  publicDescription: string;
  showPaidAmount: boolean;
  photoPath: string | null;
  photoUrl: string | null;
  extraPhotos: { path: string; url: string }[];
  photoCrop: PhotoCrop | null;
  isFeatured: boolean;
};

const statusMeta: Record<ProjectModificationStatus, { label: string; variant: "success" | "warning" | "secondary" | "default" }> = {
  installed: { label: "Instalada", variant: "success" },
  planned: { label: "Planejada", variant: "warning" },
  wishlist: { label: "Wishlist", variant: "default" },
  removed: { label: "Removida", variant: "secondary" },
};

const emptyDraft = (): Draft => ({
  catalogId: "",
  specialName: "",
  special: false,
  status: "planned",
  paidAmount: null,
  note: "",
  publicDescription: "",
  showPaidAmount: false,
  photoPath: null,
  photoUrl: null,
  extraPhotos: [],
  photoCrop: null,
  isFeatured: false,
});

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatEstimate(item: ModificationCatalogItem) {
  const min = formatCurrency(item.estimated_price_min);
  const max = formatCurrency(item.estimated_price_max);
  if (min && max) return min === max ? min : `${min} – ${max}`;
  return min || max;
}

function ModificationImage({
  item,
  className,
  eager = false,
}: {
  item: Pick<ProjectModification, "project_photo_url" | "photo_gallery"> & { catalog: Pick<ModificationCatalogItem, "name" | "default_image_path"> };
  className?: string;
  eager?: boolean;
}) {
  const isProjectPhoto = Boolean(item.project_photo_url);
  const image = item.project_photo_url ?? item.catalog.default_image_path;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border/70", isProjectPhoto ? "bg-background/45" : "bg-[#f5f5f5]", className)}>
      {image ? (
        isProjectPhoto && item.photo_gallery?.crop ? <ModificationCover src={image} crop={item.photo_gallery.crop} alt={item.catalog.name} /> : <ProjectImage src={image} alt={item.catalog.name} fill loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} sizes="(min-width: 1280px) 370px, (min-width: 640px) calc((100vw - 96px) / 2), calc(100vw - 58px)" fallbackSrc="/modifications/photo-unavailable.svg" className={isProjectPhoto ? "object-cover" : "object-contain p-2"} />
      ) : (
        <div className="flex size-full items-center justify-center bg-[#f5f5f5]">
          <Wrench className="size-9 text-neutral-400" aria-hidden="true" />
        </div>
      )}
      <span
        className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm"
        title={isProjectPhoto ? "Foto do projeto" : image ? "Imagem ilustrativa" : "Sem foto"}
      >
        {isProjectPhoto ? <Camera className="size-3" aria-hidden="true" /> : <Sparkles className="size-3" aria-hidden="true" />}
        {isProjectPhoto ? "Foto do projeto" : image ? "Imagem ilustrativa" : "Sem foto"}
      </span>
    </div>
  );
}

function ModificationEditor({
  editing,
  catalog,
  categories,
  draft,
  pending,
  uploading,
  notice,
  onClose,
  onChange,
  onSave,
  onUpload,
}: {
  editing: ProjectModification | null;
  catalog: ModificationCatalogItem[];
  categories: ModificationCategoryRow[];
  draft: Draft;
  pending: boolean;
  uploading: boolean;
  notice: string | null;
  onClose: () => void;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onUpload: (files: File[], replaceIndex?: number) => void;
}) {
  const [manualCropOpen, setManualCropOpen] = React.useState(false);
  const [dismissedCropPath, setDismissedCropPath] = React.useState<string | null>(null);
  const cropOpen = manualCropOpen || (draft.photoPath !== dismissedCropPath && draft.photoPath?.includes("/pending-modifications/"));
  const closeCrop = () => {
    setDismissedCropPath(draft.photoPath);
    setManualCropOpen(false);
  };
  const selected = catalog.find((item) => item.id === draft.catalogId);
  const submittingDisabled = pending || uploading || (draft.special ? !draft.specialName.trim() : !draft.catalogId);
  return (
    <Dialog.Root open onOpenChange={(nextOpen) => { if (!nextOpen && !pending) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[85] bg-black/65 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} onInteractOutside={(event) => event.preventDefault()} className="fixed inset-x-0 bottom-0 z-[86] max-h-[92dvh] overflow-y-auto overscroll-contain outline-none sm:inset-0 sm:m-auto sm:h-fit sm:max-w-3xl">
      <Card className="w-full rounded-b-none p-4 sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Catálogo de modificações</p>
            <Dialog.Title asChild><h2 className="mt-1 font-title text-2xl tracking-tight">{editing ? "Editar modificação" : "Adicionar modificação"}</h2></Dialog.Title>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Fechar">
            <X className="size-5" />
          </Button>
        </div>

        <div className="mt-6 space-y-6">
          {draft.special ? <label className="grid gap-2 text-sm font-semibold">Nome da peça<input maxLength={120} value={draft.specialName} onChange={(event) => onChange({ ...draft, specialName: event.target.value })} className="h-11 rounded-xl border border-border/80 bg-background px-3 font-normal" /></label> : <div>
            <p className="mb-2 text-sm font-semibold">1. Escolha no catálogo</p>
            <CatalogPicker categories={categories} catalog={catalog} selectedId={draft.catalogId} onSelect={(catalogId) => onChange({ ...draft, catalogId })} />
          </div>}

          {selected && !draft.special ? (
            <div className="rounded-2xl border border-border/70 bg-background/30 p-3 text-sm">
              <span className="font-semibold">{selected.name}</span>
              {selected.short_description ? <span className="ml-2 text-muted">{selected.short_description}</span> : null}
              {formatEstimate(selected) ? <span className="ml-2 text-muted">Estimativa: {formatEstimate(selected)}</span> : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Status
              <select
                value={draft.status}
                onChange={(event) => onChange({ ...draft, status: event.target.value as ProjectModificationStatus })}
                className="h-11 rounded-xl border border-border/80 bg-background px-3 font-normal text-foreground outline-none focus:border-accent"
              >
                {Object.entries(statusMeta).map(([value, meta]) => <option value={value} key={value}>{meta.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Valor pago (opcional)
              <input
                value={draft.paidAmount ?? ""}
                onChange={(event) => onChange({ ...draft, paidAmount: event.target.value === "" ? null : Number(event.target.value) })}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="Ex.: 11800"
                className="h-11 rounded-xl border border-border/80 bg-background px-3 font-normal text-foreground outline-none placeholder:text-muted focus:border-accent"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={draft.showPaidAmount} onChange={(event) => onChange({ ...draft, showPaidAmount: event.target.checked })} />
            Mostrar o valor pago aos visitantes
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.isFeatured} onChange={(event) => onChange({ ...draft, isFeatured: event.target.checked })} /> Destacar no meu projeto</label>

          <label className="grid gap-2 text-sm font-semibold">
            Descrição pública (opcional)
            <textarea value={draft.publicDescription} onChange={(event) => onChange({ ...draft, publicDescription: event.target.value })} maxLength={1000} rows={3} placeholder="Conte o que foi instalado ou planejado." className="rounded-xl border border-border/80 bg-background p-3 font-normal text-foreground outline-none placeholder:text-muted focus:border-accent" />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Anotações privadas (somente você)
            <textarea
              value={draft.note}
              onChange={(event) => onChange({ ...draft, note: event.target.value })}
              maxLength={1000}
              rows={3}
              placeholder="Ex.: Turbo Master Power, 0,8 kg, instalado em 2026."
              className="rounded-xl border border-border/80 bg-background p-3 font-normal text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          <div className="rounded-2xl border border-dashed border-border/80 bg-background/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Fotos do projeto</p><p className="mt-1 text-xs text-muted">Até 3 fotos JPG, PNG ou WebP de até 5 MB. A primeira é a capa.</p></div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-surface px-4 text-sm font-semibold"><Camera className="size-4" /> Adicionar fotos<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending || uploading || (draft.photoUrl ? 1 : 0) + draft.extraPhotos.length >= 3 || Boolean(draft.photoUrl && !draft.photoPath)} onChange={(event) => { onUpload(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">{(draft.photoUrl ? [{ path: draft.photoPath ?? "", url: draft.photoUrl }, ...draft.extraPhotos] : []).map((photo, index, photos) => <div key={photo.path} className="w-28 space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-border/70">{index === 0 ? <ModificationCover src={photo.url} crop={draft.photoCrop} alt="Capa" /> : <img src={photo.url} alt={`Foto ${index + 1}`} className="size-full object-cover" />}</div>
              <p className="text-xs font-semibold">{index === 0 ? "Capa" : `Foto ${index + 1}`}</p>
              {index === 0 ? <button type="button" className="block text-xs underline" onClick={() => setManualCropOpen(true)}>Ajustar recorte</button> : null}
              <label className="block cursor-pointer text-xs underline">Substituir<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending || uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload([file], index); event.currentTarget.value = ""; }} /></label>
              <button type="button" disabled={pending || uploading} className="block text-xs underline" onClick={() => { const next = photos.filter((_, i) => i !== index); onChange({ ...draft, photoPath: next[0]?.path ?? null, photoUrl: next[0]?.url ?? null, extraPhotos: next.slice(1), photoCrop: index === 0 ? null : draft.photoCrop }); if (index === 0 && next.length) setManualCropOpen(true); }}>Remover</button>
            </div>)}</div>
          </div>
          {cropOpen && draft.photoUrl ? <ModificationCropDialog src={draft.photoUrl} initial={draft.photoCrop} onCancel={closeCrop} onSave={(photoCrop) => { onChange({ ...draft, photoCrop }); closeCrop(); }} /> : null}
        </div>

        {notice ? <div role="status" className="mt-5 rounded-xl border border-border/70 bg-surface/65 px-4 py-3 text-sm">{notice}</div> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button type="button" onClick={onSave} disabled={submittingDisabled}>
            {pending || uploading ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {editing ? "Salvar alterações" : "Adicionar modificação"}
          </Button>
        </div>
      </Card>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ProjectModifications({ carId, projectName, projectHref, canEdit, categories, catalog, modifications }: Props) {
  const [open, setOpen] = React.useState(false);
  const [gallery, setGallery] = React.useState<{ name: string; urls: string[] } | null>(null);
  const [galleryIndex, setGalleryIndex] = React.useState(0);
  const [editing, setEditing] = React.useState<ProjectModification | null>(null);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const draftRef = React.useRef(draft);
  const editorGeneration = React.useRef(0);

  const discardPendingPhoto = (path: string | null) => {
    if (!path?.includes("/pending-modifications/")) return;
    void fetch("/api/uploads/image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => undefined);
  };
  const changeDraft = (next: Draft) => {
    const previous = draftRef.current;
    draftRef.current = next;
    setDraft(next);
    const nextPaths = [next.photoPath, ...next.extraPhotos.map((photo) => photo.path)];
    [previous.photoPath, ...previous.extraPhotos.map((photo) => photo.path)].forEach((path) => { if (!nextPaths.includes(path)) discardPendingPhoto(path); });
  };
  React.useEffect(() => () => { [draftRef.current.photoPath, ...draftRef.current.extraPhotos.map((photo) => photo.path)].forEach(discardPendingPhoto); }, []);
  React.useEffect(() => {
    const paths = [draft.photoPath, ...draft.extraPhotos.map((photo) => photo.path)].filter((path): path is string => Boolean(path?.includes("/pending-modifications/")));
    if (!open || !paths.length) return;
    const renew = () => { paths.forEach((path) => { void fetch("/api/uploads/image", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) }).then((response) => { if (response.status === 409) setNotice("Uma foto temporária expirou. Envie novamente antes de salvar."); }).catch(() => undefined); }); };
    renew();
    const timer = window.setInterval(renew, 2 * 60 * 1000);
    window.addEventListener("focus", renew);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", renew); };
  }, [open, draft.photoPath, draft.extraPhotos]);

  const startNew = () => {
    editorGeneration.current += 1;
    setEditing(null);
    changeDraft(emptyDraft());
    setNotice(null);
    setOpen(true);
  };
  const startSpecial = () => {
    editorGeneration.current += 1;
    setEditing(null);
    changeDraft({ ...emptyDraft(), special: true });
    setNotice(null);
    setOpen(true);
  };
  const startEdit = (modification: ProjectModification) => {
    editorGeneration.current += 1;
    setEditing(modification);
    changeDraft({
      catalogId: modification.catalog_id || "",
      special: Boolean(modification.custom_name),
      specialName: modification.custom_name ?? "",
      status: modification.status,
      paidAmount: modification.paid_amount,
      note: modification.note ?? "",
      publicDescription: modification.public_description ?? "",
      showPaidAmount: modification.show_paid_amount ?? false,
      photoPath: modification.project_photo_storage_path ?? (modification.project_photo_url ? projectImagePathFromUrl(modification.project_photo_url) : null),
      photoUrl: modification.project_photo_url,
      extraPhotos: (modification.photo_gallery?.paths ?? []).map((path) => ({ path, url: projectImageUrl(path) })),
      photoCrop: modification.photo_gallery?.crop ?? null,
      isFeatured: Boolean(modification.is_featured),
    });
    setNotice(null);
    setOpen(true);
  };
  const save = () => {
    if (!carId) return;
    startTransition(async () => {
      const input = { catalogId: draft.catalogId, specialName: draft.special ? draft.specialName : "", status: draft.status, paidAmount: draft.paidAmount, note: draft.note, publicDescription: draft.publicDescription, showPaidAmount: draft.showPaidAmount, photoPath: draft.photoPath, photoPaths: draft.extraPhotos.map((photo) => photo.path), photoCrop: draft.photoCrop, preserveLegacyPhoto: Boolean(draft.photoUrl && !draft.photoPath), isFeatured: draft.isFeatured };
      const result = editing
        ? await updateProjectModification(carId, editing.id, input)
        : await createProjectModification(carId, input);
      setNotice(result.message);
      if (result.ok) {
        editorGeneration.current += 1;
        changeDraft(emptyDraft());
        setOpen(false);
      } else {
        const current = draftRef.current;
        const kept = [current.photoPath && current.photoUrl ? { path: current.photoPath, url: current.photoUrl } : null, ...current.extraPhotos].filter((photo): photo is { path: string; url: string } => Boolean(photo && !photo.path.includes("/pending-modifications/")));
        changeDraft({ ...current, photoPath: kept[0]?.path ?? null, photoUrl: kept[0]?.url ?? null, extraPhotos: kept.slice(1), photoCrop: kept[0]?.path === current.photoPath ? current.photoCrop : null });
      }
    });
  };
  const remove = (modification: ProjectModification) => {
    if (!carId || !window.confirm(`Excluir ${modification.catalog.name} deste projeto?`)) return;
    startTransition(async () => {
      const result = await deleteProjectModification(carId, modification.id);
      setNotice(result.message);
    });
  };
  const upload = async (files: File[], replaceIndex?: number) => {
    const currentCount = (draftRef.current.photoUrl ? 1 : 0) + draftRef.current.extraPhotos.length;
    if (!files.length) return;
    if (files.length + currentCount - (replaceIndex === undefined ? 0 : 1) > 3) { setNotice("Selecione no máximo três fotos."); return; }
    const generation = ++editorGeneration.current;
    setUploading(true); setNotice(null);
    try {
      for (const file of files) {
        const data = new FormData(); data.append("kind", "modification"); data.append("file", file);
        const response = await fetch("/api/uploads/image", { method: "POST", body: data });
        const payload = await response.json() as { message?: string; path?: string; url?: string };
        if (!response.ok || !payload.path || !payload.url) throw new Error(payload.message || "Não foi possível enviar a foto.");
        if (generation !== editorGeneration.current) { discardPendingPhoto(payload.path); break; }
        const current = draftRef.current;
        const photos = current.photoUrl ? [{ path: current.photoPath ?? "", url: current.photoUrl }, ...current.extraPhotos] : [];
        if (replaceIndex === undefined) photos.push({ path: payload.path, url: payload.url });
        else photos[replaceIndex] = { path: payload.path, url: payload.url };
        changeDraft({ ...current, photoPath: photos[0].path, photoUrl: photos[0].url, extraPhotos: photos.slice(1), photoCrop: replaceIndex === 0 ? null : current.photoCrop });
      }
    } catch (error) { if (generation === editorGeneration.current) setNotice(error instanceof Error ? error.message : "Não foi possível enviar a foto."); }
    finally { if (generation === editorGeneration.current) setUploading(false); }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-6 pt-24 sm:px-6 lg:px-8 lg:pb-10 lg:pt-28">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={projectHref} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"><ChevronLeft className="size-4" /> Voltar ao projeto</Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{projectName}</p>
          <h1 className="mt-1 font-title text-3xl tracking-tight sm:text-4xl">Modificações</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Documente o que já foi instalado, os próximos planos e a wishlist. Fotos reais aparecem primeiro; a imagem ilustrativa do catálogo continua preservada.</p>
          <a href="/modifications/photo-credits.html" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-muted underline underline-offset-4">Créditos e licenças das fotos ilustrativas</a>
        </div>
        {canEdit ? <div className="flex flex-wrap gap-2"><Button onClick={startNew}><Plus className="size-4" /> Adicionar modificação</Button><Button variant="outline" onClick={startSpecial}><Plus className="size-4" /> Componente personalizado</Button></div> : null}
      </div>

      {notice && !open ? <div role="status" className="mt-5 rounded-xl border border-border/70 bg-surface/65 px-4 py-3 text-sm">{notice}</div> : null}
      {!carId ? <Card className="mt-8 p-6 text-sm text-muted">As modificações estarão disponíveis quando este projeto estiver salvo no banco.</Card> : null}
      {carId && !catalog.length ? <Card className="mt-8 p-6 text-sm text-muted">O catálogo ainda não está disponível. Aplique a migration do catálogo para começar.</Card> : null}
      {carId && catalog.length && !modifications.length ? (
        <Card className="mt-8 grid place-items-center p-10 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent"><Wrench className="size-7" /></div>
          <h2 className="mt-4 font-title text-2xl">Nenhuma modificação cadastrada</h2>
          <p className="mt-2 max-w-md text-sm text-muted">Escolha um item do catálogo para registrar a configuração do carro, o status, o valor e uma foto real quando quiser.</p>
          {canEdit ? <Button className="mt-5" onClick={startNew}><Plus className="size-4" /> Adicionar a primeira</Button> : null}
        </Card>
      ) : null}

      {modifications.length ? <CatalogDetailsProvider><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modifications.map((modification, index) => {
          const estimate = formatEstimate(modification.catalog);
          return <Card id={`peca-${modification.id}`} key={modification.id} className="flex min-h-0 flex-col p-3">
            {modification.custom_name ? <button type="button" className="block w-full text-left" onClick={() => { if (modification.project_photo_url) { setGallery({ name: modification.catalog.name, urls: [modification.project_photo_url, ...(modification.photo_gallery?.paths ?? []).map(projectImageUrl)] }); setGalleryIndex(0); } }}><ModificationImage item={modification} eager={index === 0} className="aspect-[16/10]" /></button> : <CatalogDetails item={modification.catalog}><button type="button" aria-label={`Ver detalhes de ${modification.catalog.name}`} className="pg-interactive-card block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"><ModificationImage item={modification} eager={index === 0} className={modification.project_photo_url ? "aspect-[16/10]" : "aspect-square"} /></button></CatalogDetails>}
            <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted">{modification.catalog.category.name}</p>
                  <h2 className="truncate font-title text-xl tracking-tight">{modification.catalog.name}</h2>
                </div>
                <Badge variant={statusMeta[modification.status].variant}>{statusMeta[modification.status].label}</Badge>
              </div>
              {modification.is_featured ? <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent"><Star className="size-3.5" /> Em destaque</span> : null}
              {modification.public_description ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{modification.public_description}</p> : <p className="mt-3 text-sm text-muted">Sem descrição pública.</p>}
              {canEdit && modification.note ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">Anotação privada: {modification.note}</p> : null}
              <div className="mt-4 grid gap-1 border-t border-border/60 pt-3 text-xs">
                {modification.paid_amount !== null ? <span className="inline-flex items-center gap-1.5 font-semibold"><CircleDollarSign className="size-3.5 text-accent" /> Pago: {formatCurrency(modification.paid_amount)}{canEdit && !modification.show_paid_amount ? " (privado)" : ""}</span> : null}
                {estimate ? <span className="text-muted">Estimativa do catálogo: {estimate}</span> : null}
                {!estimate && modification.paid_amount === null ? <span className="text-muted">Valor não informado</span> : null}
              </div>
              {!modification.custom_name ? <CatalogDetails item={modification.catalog}><button type="button" className="pg-text-action mt-3 min-h-11 self-start rounded-md text-sm font-semibold text-muted underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Detalhes de ${modification.catalog.name}`}>Conhecer componente</button></CatalogDetails> : null}
              {modification.project_photo_url ? <button type="button" className="mt-3 self-start text-sm font-semibold underline" onClick={() => { setGallery({ name: modification.catalog.name, urls: [modification.project_photo_url!, ...(modification.photo_gallery?.paths ?? []).map(projectImageUrl)] }); setGalleryIndex(0); }}>Ver fotos</button> : null}
              {canEdit ? <div className="mt-4 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => startEdit(modification)}><Pencil className="size-3.5" /> Editar</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(modification)} disabled={pending} aria-label={`Excluir ${modification.catalog.name}`}><Trash2 className="size-4 text-danger" /></Button>
              </div> : null}
            </div>
          </Card>;
        })}
      </div></CatalogDetailsProvider> : null}

      {!canEdit && carId ? <p className="mt-8 text-center text-sm text-muted">Somente o proprietário pode alterar as modificações deste projeto.</p> : null}
      <Dialog.Root open={Boolean(gallery)} onOpenChange={(open) => { if (!open) setGallery(null); }}><Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-4">
          <Dialog.Title className="font-title text-xl">{gallery?.name}</Dialog.Title><Dialog.Description className="sr-only">Fotografias do componente</Dialog.Description>
          {gallery ? <><div className="mt-4 flex h-[min(60dvh,32rem)] items-center justify-center bg-black"><img src={gallery.urls[galleryIndex]} alt={`Foto ${galleryIndex + 1} de ${gallery.name}`} className="max-h-full max-w-full object-contain" /></div>
          <div className="mt-3 flex items-center justify-between gap-2"><Button type="button" variant="outline" disabled={galleryIndex === 0} onClick={() => setGalleryIndex((i) => i - 1)}>Anterior</Button><span className="text-sm">{galleryIndex + 1} / {gallery.urls.length}</span><Button type="button" variant="outline" disabled={galleryIndex >= gallery.urls.length - 1} onClick={() => setGalleryIndex((i) => i + 1)}>Próxima</Button><Dialog.Close asChild><Button type="button" variant="ghost">Fechar</Button></Dialog.Close></div></> : null}
        </Dialog.Content></Dialog.Portal></Dialog.Root>
      {open ? <ModificationEditor
        editing={editing}
        catalog={catalog}
        categories={categories}
        draft={draft}
        pending={pending}
        uploading={uploading}
        notice={notice}
        onClose={() => { if (!pending) { editorGeneration.current += 1; changeDraft(emptyDraft()); setUploading(false); setOpen(false); } }}
        onChange={changeDraft}
        onSave={save}
        onUpload={upload}
      /> : null}
    </main>
  );
}
