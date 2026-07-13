"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { ProjectSearchBox } from "@/components/projects/project-search-box";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProjectFilters } from "@/lib/projects/types";

const DEFAULT_STYLES = [
  "JDM",
  "Off-road",
  "Turbo",
  "Aspirado",
  "Stance",
  "Clássico",
  "Sleeper",
  "Track day",
  "Original",
] as const;

const DEFAULT_FUELS = ["Gasolina", "Flex", "Etanol", "Diesel", "GNV", "Elétrico", "Híbrido"] as const;
const DEFAULT_INDUCTIONS = ["Aspirado", "Turbo", "Supercharger"] as const;
const DEFAULT_DRIVETRAINS = ["FWD", "RWD", "AWD", "4x4", "Dianteira", "Traseira", "Integral"] as const;

type FiltersProps = {
  filters: ProjectFilters;
  availableStyles: string[];
  availableEngines: string[];
  availableBrands: string[];
  availableModels: string[];
  availableYears: string[];
  availableFuels: string[];
  availableInductions: string[];
  availableDrivetrains: string[];
  availableCategories: string[];
  actionPath?: string;
};

type FilterOption = { value: string; label: string };

function uniqueOptions(values: readonly string[], extraValues: string[]) {
  return Array.from(new Set([...values, ...extraValues].filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

function SelectControl({
  name,
  value,
  label,
  options,
}: {
  name: string;
  value: string;
  label: string;
  options: FilterOption[];
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="pg-control h-12 w-full rounded-3xl px-4 text-sm"
      aria-label={label}
    >
      <option value="">{label.replace("Filtrar por ", "")}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const SORT_OPTIONS: FilterOption[] = [
  { value: "relevance", label: "Relevância" },
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recente" },
  { value: "updated", label: "Recentemente atualizados" },
  { value: "likes", label: "Mais curtidos" },
  { value: "comments", label: "Mais comentados" },
  { value: "views", label: "Mais vistos" },
  { value: "invested", label: "Mais investidos" },
];

function FilterSelects({
  filters,
  categories,
  fuels,
  inductions,
  drivetrains,
  availableEngines,
  availableBrands,
  availableModels,
  availableYears,
}: FiltersProps & {
  categories: string[];
  fuels: string[];
  inductions: string[];
  drivetrains: string[];
}) {
  const options = (values: string[]) => values.map((value) => ({ value, label: value }));

  return (
    <>
      <SelectControl name="brand" value={filters.brand} label="Filtrar por marca" options={options(availableBrands)} />
      <SelectControl name="model" value={filters.model} label="Filtrar por modelo" options={options(availableModels)} />
      <SelectControl name="year" value={filters.year} label="Filtrar por ano" options={options(availableYears)} />
      <SelectControl name="category" value={filters.category || filters.style} label="Filtrar por categoria" options={options(categories)} />
      <SelectControl name="engine" value={filters.engine} label="Filtrar por motor" options={options(availableEngines)} />
      <SelectControl name="fuel" value={filters.fuel} label="Filtrar por combustível" options={options(fuels)} />
      <SelectControl name="induction" value={filters.induction} label="Filtrar por aspirado ou turbo" options={options(inductions)} />
      <SelectControl name="drivetrain" value={filters.drivetrain} label="Filtrar por tração" options={options(drivetrains)} />
    </>
  );
}

function buildFilterHref(actionPath: string, filters: ProjectFilters, removedKey: keyof ProjectFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== removedKey && value && !(key === "sort" && value === "relevance")) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `${actionPath}?${query}` : actionPath;
}

export function ProjectFilters(props: FiltersProps) {
  const { filters, actionPath = "/explorar" } = props;
  const categories = uniqueOptions(DEFAULT_STYLES, [...props.availableStyles, ...props.availableCategories]);
  const fuels = uniqueOptions(DEFAULT_FUELS, props.availableFuels);
  const inductions = uniqueOptions(DEFAULT_INDUCTIONS, props.availableInductions);
  const drivetrains = uniqueOptions(DEFAULT_DRIVETRAINS, props.availableDrivetrains);
  const advancedFilters: Array<{ key: keyof ProjectFilters; label: string; value: string }> = [
    { key: "brand", label: "Marca", value: filters.brand },
    { key: "model", label: "Modelo", value: filters.model },
    { key: "year", label: "Ano", value: filters.year },
    { key: filters.category ? "category" : "style", label: "Categoria", value: filters.category || filters.style },
    { key: "engine", label: "Motor", value: filters.engine },
    { key: "fuel", label: "Combustível", value: filters.fuel },
    { key: "induction", label: "Indução", value: filters.induction },
    { key: "drivetrain", label: "Tração", value: filters.drivetrain },
    { key: "tag", label: "Tag", value: filters.tag ?? "" },
  ];
  const activeFilters = advancedFilters.filter((item) => item.value);

  const preservedSearchFilters = advancedFilters.filter((item) => item.value);

  return (
    <>
      <Dialog.Root>
        <Card className="p-3 md:hidden">
          <form data-project-search-form action={actionPath} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <ProjectSearchBox defaultValue={filters.q} ariaLabel="Pesquisar catálogo no celular" />
            {preservedSearchFilters.map((item) => (
              <input key={item.key} type="hidden" name={item.key} value={item.value} />
            ))}
            <Dialog.Trigger asChild>
              <Button type="button" variant="outline" className="relative min-h-12 px-3" aria-label="Abrir filtros avançados">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                <span className="max-[359px]:sr-only">Filtros</span>
                {activeFilters.length ? (
                  <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {activeFilters.length}
                  </span>
                ) : null}
              </Button>
            </Dialog.Trigger>
            <div className="col-span-2 flex items-center gap-2">
              <label htmlFor="mobile-project-sort" className="shrink-0 text-xs font-semibold text-muted">Ordenar</label>
              <select
                id="mobile-project-sort"
                name="sort"
                defaultValue={filters.sort}
                className="pg-control h-10 min-w-0 flex-1 rounded-3xl px-3 text-xs"
                aria-label="Ordenação mobile"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Button type="submit" size="sm">Buscar</Button>
            </div>
          </form>

          {activeFilters.length ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtros ativos">
              {activeFilters.map((item) => (
                <Link
                  key={item.key}
                  href={buildFilterHref(actionPath, filters, item.key)}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 text-xs font-semibold text-foreground"
                  aria-label={`Remover filtro ${item.label}: ${item.value}`}
                >
                  {item.label}: {item.value}
                  <X className="size-3" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </Card>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm md:hidden" />
          <Dialog.Content
            className="fixed inset-x-0 bottom-0 z-[90] max-h-[88dvh] overflow-hidden rounded-t-[2rem] border border-border/80 bg-card shadow-2xl md:hidden"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4">
              <div>
                <Dialog.Title className="font-title text-xl tracking-tight">Filtros</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-muted">
                  {activeFilters.length ? `${activeFilters.length} filtros ativos` : "Refine os projetos da comunidade"}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button type="button" size="icon" variant="ghost" className="size-10" aria-label="Fechar filtros">
                  <X className="size-5" aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>

            <form action={actionPath} className="flex max-h-[calc(88dvh-73px)] flex-col">
              <div className="grid gap-3 overflow-y-auto overscroll-contain px-4 py-4">
                {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
                <FilterSelects {...props} categories={categories} fuels={fuels} inductions={inductions} drivetrains={drivetrains} />
                <SelectControl name="sort" value={filters.sort} label="Ordenar projetos" options={SORT_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border/70 bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
                <Button asChild type="button" variant="outline">
                  <Link href={actionPath}>Limpar</Link>
                </Button>
                <Button type="submit">Aplicar filtros</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Card className="hidden p-5 md:block">
        <form
          data-project-search-form
          className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,0.75fr))_auto]"
          action={actionPath}
        >
          <div className="lg:col-span-2 xl:col-span-1">
            <ProjectSearchBox defaultValue={filters.q} />
          </div>
          <FilterSelects {...props} categories={categories} fuels={fuels} inductions={inductions} drivetrains={drivetrains} />
          <SelectControl name="sort" value={filters.sort} label="Ordenar projetos" options={SORT_OPTIONS} />
          <div className="flex gap-2 lg:col-span-2 xl:col-span-1">
            <Button type="submit" className="min-w-28">Filtrar</Button>
            <Button asChild type="button" variant="outline"><Link href={actionPath}>Limpar</Link></Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted">
          Explore por apelido, modelo, marca, ano, motor, descrição e tags. Os filtros funcionam juntos e ficam salvos na URL.
        </p>
      </Card>
    </>
  );
}
