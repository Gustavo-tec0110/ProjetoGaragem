import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function ProjectFilters({
  filters,
  availableStyles,
  availableEngines,
  actionPath = "/explorar",
}: {
  filters: ProjectFilters;
  availableStyles: string[];
  availableEngines: string[];
  actionPath?: string;
}) {
  const styles = Array.from(new Set([...DEFAULT_STYLES, ...availableStyles])).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );

  return (
    <Card className="p-4 md:p-5">
      <form
        className="grid gap-3 xl:grid-cols-[1.7fr_0.9fr_1fr_0.95fr_auto]"
        action={actionPath}
      >
        <label className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            name="q"
            defaultValue={filters.q}
            placeholder="Busque por projeto, Gol, Volkswagen, #turbo, JDM, off-road, stance..."
            className="pl-11"
          />
        </label>

        <select
          name="style"
          defaultValue={filters.style}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
        >
          <option value="">Todos os estilos</option>
          {styles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>

        <select
          name="engine"
          defaultValue={filters.engine}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
        >
          <option value="">Todos os motores</option>
          {availableEngines.map((engine) => (
            <option key={engine} value={engine}>
              {engine}
            </option>
          ))}
        </select>

        <select
          name="sort"
          defaultValue={filters.sort}
          className="pg-control h-12 rounded-3xl px-4 text-sm"
        >
          <option value="hot">Em alta</option>
          <option value="recent">Mais recentes</option>
          <option value="updated">Recentemente atualizados</option>
          <option value="likes">Mais curtidos</option>
          <option value="views">Mais vistos</option>
          <option value="invested">Mais investidos</option>
        </select>

        <div className="flex gap-2">
          <Button type="submit" className="min-w-28">
            Filtrar
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={actionPath}>Limpar</Link>
          </Button>
        </div>
      </form>
      <p className="mt-3 text-xs text-muted">
        Explore por nome do projeto, modelo, marca, tags e estilos como JDM, off-road,
        turbo, stance, sleeper, original e track day.
      </p>
    </Card>
  );
}
