"use client";

import { PiggyBank } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/projects/types";
import { formatProjectCurrency } from "@/lib/projects/utils";

export function ProjectFinanceChart({ project }: { project: Project }) {
  const total = project.totalInvested ?? project.estimatedCost ?? 0;
  const categories = project.financeByCategory;

  if (!categories.length && total <= 0) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
        Ainda nao existem gastos registrados neste projeto.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10 text-accent">
            <PiggyBank className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Total investido</p>
            <p className="font-title text-3xl tracking-tight">
              {formatProjectCurrency(total)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {categories.length ? (
            categories.map((category) => {
              const percentage = total > 0 ? (category.total / total) * 100 : 0;
              return (
                <div
                  key={category.category}
                  className="rounded-3xl border border-border/70 bg-background/25 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{category.category}</p>
                    <p className="text-xs text-muted">{percentage.toFixed(0)}%</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {formatProjectCurrency(category.total)}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-background/70">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, Math.max(6, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
              Sem categorias detalhadas ainda. O valor total permanece disponivel.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs text-muted">Resumo financeiro</p>
        <div className="mt-4 grid gap-3">
          <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
            <p className="text-xs text-muted">Lancamentos</p>
            <p className="mt-1 font-title text-2xl">{project.expenses.length}</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
            <p className="text-xs text-muted">Categorias ativas</p>
            <p className="mt-1 font-title text-2xl">{categories.length}</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
            <p className="text-xs text-muted">Maior frente de investimento</p>
            <p className="mt-1 font-ui text-sm font-semibold">
              {categories[0]?.category ?? "Nao informado"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
