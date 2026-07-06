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

const DEFAULT_FUELS = ["Gasolina", "Flex", "Etanol", "Diesel", "GNV", "Eletrico", "Hibrido"] as const;
const DEFAULT_INDUCTIONS = ["Aspirado", "Turbo", "Supercharger"] as const;
const DEFAULT_DRIVETRAINS = ["FWD", "RWD", "AWD", "4x4", "Dianteira", "Traseira", "Integral"] as const;

function uniqueOptions(values: readonly string[], extraValues: string[]) {
  return Array.from(new Set([...values, ...extraValues].filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export function ProjectFilters({
  filters,
  availableStyles,
  availableEngines,
  availableBrands,
  availableModels,
  availableYears,
  availableFuels,
  availableInductions,
  availableDrivetrains,
  availableCategories,
  actionPath = "/explorar",
}: {
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
}) {
  const categories = uniqueOptions(DEFAULT_STYLES, [...availableStyles, ...availableCategories]);
  const fuels = uniqueOptions(DEFAULT_FUELS, availableFuels);
  const inductions = uniqueOptions(DEFAULT_INDUCTIONS, availableInductions);
  const drivetrains = uniqueOptions(DEFAULT_DRIVETRAINS, availableDrivetrains);

  return (
    <Card className="p-4 md:p-5">
      <form
        data-project-search-form
        className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,0.75fr))_auto]"
        action={actionPath}
      >
        <div className="lg:col-span-2 xl:col-span-1">
          <ProjectSearchBox defaultValue={filters.q} />
        </div>

        <select
          name="brand"
          defaultValue={filters.brand}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por marca"
        >
          <option value="">Marca</option>
          {availableBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>

        <select
          name="model"
          defaultValue={filters.model}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por modelo"
        >
          <option value="">Modelo</option>
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <select
          name="year"
          defaultValue={filters.year}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por ano"
        >
          <option value="">Ano</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          name="category"
          defaultValue={filters.category || filters.style}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por categoria"
        >
          <option value="">Categoria</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          name="engine"
          defaultValue={filters.engine}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por motor"
        >
          <option value="">Motor</option>
          {availableEngines.map((engine) => (
            <option key={engine} value={engine}>
              {engine}
            </option>
          ))}
        </select>

        <select
          name="fuel"
          defaultValue={filters.fuel}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por combustivel"
        >
          <option value="">Combustivel</option>
          {fuels.map((fuel) => (
            <option key={fuel} value={fuel}>
              {fuel}
            </option>
          ))}
        </select>

        <select
          name="induction"
          defaultValue={filters.induction}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por aspirado ou turbo"
        >
          <option value="">Aspirado/turbo</option>
          {inductions.map((induction) => (
            <option key={induction} value={induction}>
              {induction}
            </option>
          ))}
        </select>

        <select
          name="drivetrain"
          defaultValue={filters.drivetrain}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Filtrar por tracao"
        >
          <option value="">Tracao</option>
          {drivetrains.map((drivetrain) => (
            <option key={drivetrain} value={drivetrain}>
              {drivetrain}
            </option>
          ))}
        </select>

        <select
          name="sort"
          defaultValue={filters.sort}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
          aria-label="Ordenar projetos"
        >
          <option value="relevance">Relevancia</option>
          <option value="popular">Popular</option>
          <option value="recent">Recente</option>
          <option value="updated">Recentemente atualizados</option>
          <option value="likes">Mais curtidos</option>
          <option value="comments">Mais comentados</option>
          <option value="views">Mais vistos</option>
          <option value="invested">Mais investidos</option>
        </select>

        <div className="flex gap-2 lg:col-span-2 xl:col-span-1">
          <Button type="submit" className="min-w-28">
            Filtrar
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={actionPath}>Limpar</Link>
          </Button>
        </div>
      </form>
      <p className="mt-3 text-xs text-muted">
        Explore por apelido, modelo, marca, ano, motor, descricao e tags. Os filtros
        funcionam juntos e ficam salvos na URL.
      </p>
    </Card>
  );
}
