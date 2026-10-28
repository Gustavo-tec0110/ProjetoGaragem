"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import {
  Camera,
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
import { CatalogDetails } from "@/components/projects/catalog-details";
import { CatalogPicker } from "@/components/projects/catalog-picker";
import { ProjectImage } from "@/components/projects/project-image";
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
  status: ProjectModificationStatus;
  paidAmount: number | null;
  note: string;
  publicDescription: string;
  showPaidAmount: boolean;
  photoPath: string | null;
  photoUrl: string | null;
};

const statusMeta: Record<ProjectModificationStatus, { label: string; variant: "success" | "warning" | "secondary" | "default" }> = {
  installed: { label: "Instalada", variant: "success" },
  planned: { label: "Planejada", variant: "warning" },
  wishlist: { label: "Wishlist", variant: "default" },
  removed: { label: "Removida", variant: "secondary" },
};

const emptyDraft = (): Draft => ({
  catalogId: "",
  status: "planned",
  paidAmount: null,
  note: "",
  publicDescription: "",
  showPaidAmount: false,
  photoPath: null,
  photoUrl: null,
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
}: {
  item: Pick<ProjectModification, "project_photo_url"> & { catalog: Pick<ModificationCatalogItem, "name" | "default_image_path"> };
  className?: string;
}) {
  const isProjectPhoto = Boolean(item.project_photo_url);
  const image = item.project_photo_url ?? item.catalog.default_image_path;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border/70", isProjectPhoto ? "bg-background/45" : "bg-[#f5f5f5]", className)}>
      {image ? (
        <ProjectImage src={image} alt={item.catalog.name} fill sizes="(min-width: 1280px) 370px, (min-width: 640px) calc((100vw - 96px) / 2), calc(100vw - 58px)" fallbackSrc="/modifications/photo-unavailable.svg" className={isProjectPhoto ? "object-cover" : "object-contain p-2"} />
      ) : (
        <div className="flex size-full items-center justify-center bg-[#f5f5f5]">
          <Wrench className="size-9 text-neutral-400" aria-hidden="true" />
        </div>
      )}
      <span
        className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/85 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm"
        title={isProjectPhoto ? "Foto do projeto" : image ? "Imagem ilustrativa" : "Foto em revisão"}
      >
        {isProjectPhoto ? <Camera className="size-3" aria-hidden="true" /> : <Sparkles className="size-3" aria-hidden="true" />}
        {isProjectPhoto ? "Foto do projeto" : image ? "Imagem ilustrativa" : "Foto em revisão"}
      </span>
    </div>
  );
}

function ModificationEditor({
  open,
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
  open: boolean;
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
  onUpload: (file: File) => void;
}) {
  if (!open) return null;
  const selected = catalog.find((item) => item.id === draft.catalogId);
  const submittingDisabled = pending || uploading || !draft.catalogId;
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !pending) onClose(); }}>
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
          <div>
            <p className="mb-2 text-sm font-semibold">1. Escolha no catálogo</p>
            <CatalogPicker categories={categories} catalog={catalog} selectedId={draft.catalogId} onSelect={(catalogId) => onChange({ ...draft, catalogId })} />
          </div>

          {selected ? (
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Foto real do projeto</p>
                <p className="mt-1 text-xs text-muted">JPG, PNG ou WebP até 5 MB. Ela substitui a imagem ilustrativa apenas neste card.</p>
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-surface px-4 text-sm font-semibold hover:bg-card">
                <Camera className="size-4" />
                Enviar foto
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending || uploading} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.currentTarget.value = "";
                }} />
              </label>
            </div>
            {draft.photoUrl ? (
              <div className="mt-4 flex items-center gap-3">
                <img src={draft.photoUrl} alt="Prévia da foto do projeto" className="size-16 rounded-xl border border-border/70 object-cover" />
                <Button type="button" variant="ghost" size="sm" disabled={pending || uploading} onClick={() => onChange({ ...draft, photoPath: null, photoUrl: null })}>Remover foto</Button>
              </div>
            ) : null}
          </div>
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
    if (previous.photoPath !== next.photoPath) discardPendingPhoto(previous.photoPath);
  };
  React.useEffect(() => () => discardPendingPhoto(draftRef.current.photoPath), []);
  React.useEffect(() => {
    const path = draft.photoPath;
    if (!open || !path?.includes("/pending-modifications/")) return;
    const renew = () => {
      void fetch("/api/uploads/image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      }).then((response) => {
        if (response.status === 409) setNotice("A foto temporária expirou. Envie novamente antes de salvar.");
      }).catch(() => undefined);
    };
    renew();
    const timer = window.setInterval(renew, 2 * 60 * 1000);
    window.addEventListener("focus", renew);
    document.addEventListener("visibilitychange", renew);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", renew);
      document.removeEventListener("visibilitychange", renew);
    };
  }, [open, draft.photoPath]);

  const startNew = () => {
    editorGeneration.current += 1;
    setEditing(null);
    changeDraft(emptyDraft());
    setNotice(null);
    setOpen(true);
  };
  const startEdit = (modification: ProjectModification) => {
    editorGeneration.current += 1;
    setEditing(modification);
    changeDraft({
      catalogId: modification.catalog_id,
      status: modification.status,
      paidAmount: modification.paid_amount,
      note: modification.note ?? "",
      publicDescription: modification.public_description ?? "",
      showPaidAmount: modification.show_paid_amount ?? false,
      photoPath: modification.project_photo_storage_path,
      photoUrl: modification.project_photo_url,
    });
    setNotice(null);
    setOpen(true);
  };
  const save = () => {
    if (!carId) return;
    startTransition(async () => {
      const input = { catalogId: draft.catalogId, status: draft.status, paidAmount: draft.paidAmount, note: draft.note, publicDescription: draft.publicDescription, showPaidAmount: draft.showPaidAmount, photoPath: draft.photoPath };
      const result = editing
        ? await updateProjectModification(carId, editing.id, input)
        : await createProjectModification(carId, input);
      setNotice(result.message);
      if (result.ok) {
        editorGeneration.current += 1;
        changeDraft(emptyDraft());
        setOpen(false);
      } else if (draftRef.current.photoPath?.includes("/pending-modifications/")) {
        changeDraft({ ...draftRef.current, photoPath: null, photoUrl: null });
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
  const upload = async (file: File) => {
    const generation = ++editorGeneration.current;
    setUploading(true);
    setNotice(null);
    const data = new FormData();
    data.append("kind", "modification");
    data.append("file", file);
    try {
      const response = await fetch("/api/uploads/image", { method: "POST", body: data });
      const payload = await response.json() as { message?: string; path?: string; url?: string };
      if (!response.ok || !payload.path || !payload.url) throw new Error(payload.message || "Não foi possível enviar a foto.");
      if (generation !== editorGeneration.current) discardPendingPhoto(payload.path);
      else changeDraft({ ...draftRef.current, photoPath: payload.path, photoUrl: payload.url });
    } catch (error) {
      if (generation === editorGeneration.current) setNotice(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      if (generation === editorGeneration.current) setUploading(false);
    }
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
        {canEdit ? <Button onClick={startNew}><Plus className="size-4" /> Adicionar modificação</Button> : null}
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

      {modifications.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modifications.map((modification) => {
          const estimate = formatEstimate(modification.catalog);
          return <Card key={modification.id} className="flex min-h-0 flex-col p-3">
            <CatalogDetails item={modification.catalog}><button type="button" aria-label={`Ver detalhes de ${modification.catalog.name}`} className="pg-interactive-card block w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"><ModificationImage item={modification} className={modification.project_photo_url ? "aspect-[16/10]" : "aspect-square"} /></button></CatalogDetails>
            <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted">{modification.catalog.category.name}</p>
                  <h2 className="truncate font-title text-xl tracking-tight">{modification.catalog.name}</h2>
                </div>
                <Badge variant={statusMeta[modification.status].variant}>{statusMeta[modification.status].label}</Badge>
              </div>
              {modification.public_description ? <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{modification.public_description}</p> : <p className="mt-3 text-sm text-muted">Sem descrição pública.</p>}
              {canEdit && modification.note ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">Anotação privada: {modification.note}</p> : null}
              <div className="mt-4 grid gap-1 border-t border-border/60 pt-3 text-xs">
                {modification.paid_amount !== null ? <span className="inline-flex items-center gap-1.5 font-semibold"><CircleDollarSign className="size-3.5 text-accent" /> Pago: {formatCurrency(modification.paid_amount)}{canEdit && !modification.show_paid_amount ? " (privado)" : ""}</span> : null}
                {estimate ? <span className="text-muted">Estimativa do catálogo: {estimate}</span> : null}
                {!estimate && modification.paid_amount === null ? <span className="text-muted">Valor não informado</span> : null}
              </div>
              <CatalogDetails item={modification.catalog}><button type="button" className="pg-text-action mt-3 min-h-11 self-start rounded-md text-sm font-semibold text-muted underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Detalhes de ${modification.catalog.name}`}>Conhecer componente</button></CatalogDetails>
              {canEdit ? <div className="mt-4 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => startEdit(modification)}><Pencil className="size-3.5" /> Editar</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(modification)} disabled={pending} aria-label={`Excluir ${modification.catalog.name}`}><Trash2 className="size-4 text-danger" /></Button>
              </div> : null}
            </div>
          </Card>;
        })}
      </div> : null}

      {!canEdit && carId ? <p className="mt-8 text-center text-sm text-muted">Somente o proprietário pode alterar as modificações deste projeto.</p> : null}
      <ModificationEditor
        open={open}
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
      />
    </main>
  );
}
