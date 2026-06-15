// src/components/projects/project-parts.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Project } from "@/lib/projects/types";
import {
  FALLBACK_CAR_CATALOG,
  matchingCatalogVersions,
  type CarCatalogVersion,
} from "@/lib/car-catalog";
import { formatProjectCurrency } from "@/lib/projects/utils";

/**
 * UI da aba "Peças" do perfil do projeto.
 *
 * Exibe:
 *  - Resumo da build (cards de valores)
 *  - Listas de peças instaladas, planejadas
 *  - Peças recomendadas a partir do catálogo de fábrica
 *  - Formulário de inserção (apenas para dono)
 *
 * Não altera nenhuma lógica de backend – apenas visualização.
 */
export function ProjectParts({ project, isOwner }: { project: Project; isOwner: boolean }) {
  // ----- Cálculos auxiliares -------------------------------------------------
  const projectWithBudget = project as Project & { budget?: number | null };
  const invested = project.totalInvested ?? 0;
  const plannedCost = project.plannedParts.reduce((s, p) => s + (p.priceEstimate ?? 0), 0);
  const estimated = project.estimatedCost ?? 0;
  const budget = projectWithBudget.budget ?? 0; // campo opcional, pode não existir
  const diff = budget - invested;

  // Peças recomendadas – usamos o catálogo fallback e filtramos por modelo/ano
  const recommended = React.useMemo(() => {
    const matches = matchingCatalogVersions(
      FALLBACK_CAR_CATALOG,
      project.carModel.split(" ")[0] ?? "",
      project.carModel.split(" ")[1] ?? "",
      project.year
    );
    // Remove versões já presentes nas partes instaladas/planned (simplesmente por nome)
    const existingNames = new Set([
      ...project.installedParts.map((p) => p.name),
      ...project.plannedParts.map((p) => p.name),
    ]);
    return matches.filter((v) => !existingNames.has(v.version)).slice(0, 5);
  }, [project]);

  // ----- Formulário de adição (apenas visual) ------------------------------
  const [newPart, setNewPart] = React.useState({
    name: "",
    category: "Outros",
    status: "installed" as const,
    price: "",
    date: "",
    notes: "",
    link: "",
  });

  const handleChange = (field: string, value: string) => {
    setNewPart((p) => ({ ...p, [field]: value }));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: não envia ao backend. Apenas limpa campos.
    setNewPart({
      name: "",
      category: "Outros",
      status: "installed" as const,
      price: "",
      date: "",
      notes: "",
      link: "",
    });
  };

  // ----- Render --------------------------------------------------------------
  return (
    <section id="pecas" className="space-y-8">
      {/* Resumo da build */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-xs text-muted">Já investido</p>
          <p className="mt-1 font-title text-2xl">{formatProjectCurrency(invested)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Planejado</p>
          <p className="mt-1 font-title text-2xl">{formatProjectCurrency(plannedCost)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Total estimado</p>
          <p className="mt-1 font-title text-2xl">{formatProjectCurrency(estimated)}</p>
        </Card>
        {budget ? (
          <Card className="p-4">
            <p className="text-xs text-muted">Orçamento</p>
            <p className="mt-1 font-title text-2xl">{formatProjectCurrency(budget)}</p>
          </Card>
        ) : null}
        {budget ? (
          <Card className="p-4">
            <p className="text-xs text-muted">Diferença</p>
            <p className="mt-1 font-title text-2xl text-" style={{ color: diff >= 0 ? "#22c55e" : "#ef4444" }}>
              {formatProjectCurrency(diff)}
            </p>
          </Card>
        ) : null}
      </div>

      {/* Instalas */}
      <PartsList title="Instaladas" parts={project.installedParts} />
      {/* Planejadas */}
      <PartsList title="Planejadas" parts={project.plannedParts} />
      {/* Recomendadas */}
      <RecommendedList title="Recomendadas para este carro" items={recommended} />

      {/* Formulário de inclusão (apenas para dono) */}
      {isOwner && (
        <Card className="p-5 md:p-6">
          <h2 className="font-title text-xl">Adicionar peça</h2>
          <form onSubmit={handleAdd} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-muted">Nome</label>
              <input
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-muted">Categoria</label>
              <input
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.category}
                onChange={(e) => handleChange("category", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-muted">Status</label>
              <select
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.status}
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="installed">Instalada</option>
                <option value="planned">Planejada</option>
                <option value="removed">Removida</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted">Preço (R$)</label>
              <input
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.price}
                onChange={(e) => handleChange("price", e.target.value)}
                type="number"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm text-muted">Data</label>
              <input
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.date}
                onChange={(e) => handleChange("date", e.target.value)}
                type="date"
              />
            </div>
            <div>
              <label className="block text-sm text-muted">Link (opcional)</label>
              <input
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.link}
                onChange={(e) => handleChange("link", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-muted">Observações</label>
              <textarea
                className="pg-control w-full rounded-3xl px-4 py-2 text-sm"
                value={newPart.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={2}
              />
            </div>
            <Button type="submit" className="md:col-span-3 self-start">
              Adicionar peça
            </Button>
          </form>
        </Card>
      )}
    </section>
  );
}

function PartsList({ title, parts }: { title: string; parts: Project["installedParts"] }) {
  if (!parts.length) {
    return (
      <section>
        <h2 className="font-title text-2xl">{title}</h2>
        <p className="text-sm text-muted">Nenhuma peça {title.toLowerCase()}.</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="font-title text-2xl mb-4">{title}</h2>
      <div className="grid gap-4">
        {parts.map((part) => (
          <Card key={part.id} className="p-4 grid gap-4 md:grid-cols-[auto_1fr_auto] items-start">
            <div className="flex flex-col gap-1">
              <Badge variant="secondary">{part.category}</Badge>
              <span className="font-medium">{part.name}</span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted">
              <span>Status: {part.status}</span>
              <span>Preço: {formatProjectCurrency(part.priceEstimate ?? 0)}</span>
              {part.externalUrl ? (
                <Button asChild variant="ghost" className="p-0 h-auto">
                  <a href={part.externalUrl} target="_blank" rel="noreferrer">
                    Ver peça
                  </a>
                </Button>
              ) : (
                <span className="text-muted-foreground">Link não disponível</span>
              )}
            </div>
            <div className="text-xs text-muted">
              {/* Dependências placeholder – pode ser preenchido futuramente */}
              Essa peça pode exigir: —
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function RecommendedList({ title, items }: { title: string; items: CarCatalogVersion[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="font-title text-2xl mb-4">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((v) => (
          <Card key={v.id} className="p-4">
            <p className="font-medium">{v.brand} {v.model} {v.version}</p>
            <p className="text-sm text-muted">{v.yearStart}‑{v.yearEnd}</p>
            <ul className="mt-2 text-xs text-muted list-disc list-inside">
              <li>Motor: {v.engineOriginal ?? "-"}</li>
              <li>Alimentação: {v.inductionOriginal ?? "-"}</li>
              <li>Potência: {v.powerHp ? `${v.powerHp} cv` : "-"}</li>
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
