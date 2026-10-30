"use client";

import * as React from "react";
import { Check, Search, Wrench, X } from "lucide-react";
import { CatalogDetails, CatalogDetailsProvider } from "@/components/projects/catalog-details";
import { ProjectImage } from "@/components/projects/project-image";
import { filterCatalog, selectableCatalog } from "@/lib/modifications/catalog-search";
import type { ModificationCatalogItem } from "@/lib/modifications/types";
import type { ModificationCategoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const INITIAL_PAGE_SIZE = 16;
const PAGE_SIZE = 40;

export function CatalogPicker({ categories, catalog, selectedId, onSelect }: {
  categories: ModificationCategoryRow[];
  catalog: ModificationCatalogItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [categoryId, setCategoryId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [limit, setLimit] = React.useState(INITIAL_PAGE_SIZE);
  const listRef = React.useRef<HTMLDivElement>(null);
  const searchId = React.useId();
  const selectable = React.useMemo(() => selectableCatalog(catalog, selectedId), [catalog, selectedId]);
  const filtered = React.useMemo(() => filterCatalog(selectable, categories, categoryId, query), [selectable, categories, categoryId, query]);
  const resetPage = (nextQuery = query) => { setLimit(nextQuery.trim() ? PAGE_SIZE : INITIAL_PAGE_SIZE); listRef.current?.scrollTo(0, 0); };
  const chooseCategory = (id: string, nextQuery = query) => { setCategoryId(id); resetPage(nextQuery); };

  return <CatalogDetailsProvider><div className="min-w-0 space-y-3">
    <label htmlFor={searchId} className="block text-xs font-semibold text-muted">Buscar peça</label>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" aria-hidden="true" />
      <input id={searchId} type="search" value={query} onChange={(event) => { setQuery(event.target.value); resetPage(event.target.value); }}
        placeholder="Nome ou termo, ex.: turbina, suspensão a ar…"
        className="h-11 w-full min-w-0 rounded-xl border border-border/80 bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:border-accent" />
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Categorias de peças" className="flex min-w-0 gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible">
        <button type="button" onClick={() => chooseCategory("")} aria-pressed={!categoryId}
          className={cn("shrink-0 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors lg:w-full", !categoryId ? "bg-accent-2 text-white" : "bg-surface text-muted hover:text-foreground")}>Todas</button>
        {categories.filter((category) => !category.parent_id).map((category) => <button type="button" key={category.id}
          onClick={() => chooseCategory(category.id)} aria-pressed={categoryId === category.id}
          className={cn("shrink-0 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors lg:w-full", categoryId === category.id ? "bg-accent-2 text-white" : "bg-surface text-muted hover:text-foreground")}>{category.name}</button>)}
      </nav>
      <div className="min-w-0">
        <p aria-label="Resultados do catálogo" aria-live="polite" aria-atomic="true" className="mb-2 text-xs text-muted">{filtered.length} {filtered.length === 1 ? "peça encontrada" : "peças encontradas"}</p>
        <div ref={listRef} className="grid max-h-80 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2" aria-label="Peças do catálogo">
          {filtered.slice(0, limit).map((item) => <div key={item.id}
            className={cn("relative flex min-h-24 min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition-colors", selectedId === item.id ? "border-accent bg-accent/10" : "border-border/70 bg-background/35 hover:border-foreground/25")}>
            <CatalogDetails item={item}><button type="button" aria-label={`Ver detalhes de ${item.name}`} className="pg-interactive-card relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f5] outline-none focus-visible:ring-2 focus-visible:ring-accent sm:size-20">
              {item.default_image_path ? <ProjectImage src={item.default_image_path} alt="" fill sizes="80px" fallbackSrc="/modifications/photo-unavailable.svg" className="object-contain p-1" /> : <Wrench className="size-6 text-neutral-400" aria-hidden="true" />}
            </button></CatalogDetails>
            <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onSelect(item.id)} aria-pressed={selectedId === item.id} className="pg-text-action min-h-11 w-full rounded-md pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span className="block break-words text-sm font-semibold leading-snug">{item.name}</span>
              <span className="mt-1 block text-xs text-muted">{item.category.name}</span>
              {!item.default_image_path ? <span className="mt-1 block text-[10px] text-muted">Foto em revisão</span> : null}
            </button>
            <CatalogDetails item={item}><button type="button" className="pg-text-action min-h-11 rounded-md text-xs font-semibold text-muted underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Detalhes de ${item.name}`}>Detalhes</button></CatalogDetails>
            </div>
            {selectedId === item.id ? <Check className="absolute right-2 top-2 size-3.5 text-accent" aria-hidden="true" /> : null}
          </div>)}
          {!filtered.length ? <div className="p-4 text-sm text-muted sm:col-span-2">
            <p>Nenhuma peça encontrada. Tente outro termo ou categoria.</p>
            <button type="button" onClick={() => { setQuery(""); chooseCategory("", ""); }} className="mt-3 inline-flex items-center gap-1 font-semibold text-accent"><X className="size-3" aria-hidden="true" /> Limpar filtros</button>
          </div> : null}
          {filtered.length > limit ? <button type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)} className="rounded-xl border border-border p-3 text-sm font-semibold hover:border-accent sm:col-span-2">Mostrar mais peças ({Math.min(limit, filtered.length)} de {filtered.length})</button> : null}
        </div>
      </div>
    </div>
  </div></CatalogDetailsProvider>;
}
