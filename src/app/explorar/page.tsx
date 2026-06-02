import Link from "next/link";
import { Search } from "lucide-react";

import { CarGrid } from "@/components/garage/car-card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CAR_CATEGORIES } from "@/lib/garage/constants";
import { qExploreCars } from "@/lib/supabase/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const metadata = {
  title: "Explorar projetos",
};

export default async function ExplorarPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    q: param(params, "q"),
    brand: param(params, "brand"),
    model: param(params, "model"),
    category: param(params, "category"),
    state: param(params, "state"),
    sort: (param(params, "sort") || "recent") as "recent" | "likes" | "saves",
  };

  const result = await qExploreCars(filters);
  const cars = result.data ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs text-muted">Catalogo social</p>
              <h1 className="mt-2 font-title text-3xl tracking-tight md:text-5xl">
                Explore projetos reais
              </h1>
              <p className="mt-3 max-w-2xl text-muted">
                Descubra fichas completas de carros da comunidade, com fotos,
                especificacoes, pecas instaladas e planos futuros.
              </p>
            </div>
            <Button asChild>
              <Link href="/carros/novo">Adicionar meu carro</Link>
            </Button>
          </div>

          <Card className="mt-8 p-4 md:p-5">
            <form className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1fr_0.55fr_0.85fr_auto]" action="/explorar">
              <label className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Buscar por projeto, marca, modelo..."
                  className="pg-control h-12 w-full rounded-3xl pl-11 pr-4 text-sm"
                />
              </label>
              <input name="brand" defaultValue={filters.brand} placeholder="Marca" className="pg-control h-12 rounded-3xl px-4 text-sm" />
              <input name="model" defaultValue={filters.model} placeholder="Modelo" className="pg-control h-12 rounded-3xl px-4 text-sm" />
              <select name="category" defaultValue={filters.category} className="pg-control h-12 rounded-3xl px-4 text-sm">
                <option value="">Categoria</option>
                {CAR_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input name="state" defaultValue={filters.state} placeholder="UF" maxLength={2} className="pg-control h-12 rounded-3xl px-4 text-sm" />
              <select name="sort" defaultValue={filters.sort} className="pg-control h-12 rounded-3xl px-4 text-sm">
                <option value="recent">Recentes</option>
                <option value="likes">Mais curtidos</option>
                <option value="saves">Mais salvos</option>
              </select>
              <Button type="submit">
                Filtrar
              </Button>
            </form>
          </Card>

          {result.error ? (
            <div className="mt-6 rounded-4xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
              Erro ao carregar projetos: {result.error}
            </div>
          ) : null}

          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Resultados</p>
                <h2 className="mt-1 font-title text-2xl tracking-tight">
                  {cars.length.toLocaleString("pt-BR")} projetos
                </h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/explorar">Limpar filtros</Link>
              </Button>
            </div>
            <CarGrid
              cars={cars}
              emptyTitle="Nenhum projeto encontrado."
              emptyAction={
                <Button asChild>
                  <Link href="/carros/novo">Adicionar meu primeiro carro</Link>
                </Button>
              }
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
