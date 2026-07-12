"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Sparkles,
  Target,
} from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getLocalProjects,
  subscribeLocalProjects,
} from "@/lib/projects/local-storage";
import { analyzeProjectInspiration } from "@/lib/projects/inspiration";
import type { Project } from "@/lib/projects/types";
import { buildProjectHref } from "@/lib/projects/utils";

type PlannerState = {
  currentSlug: string;
  referenceSlug: string;
};

const STORAGE_PREFIX = "pg-inspiration-planner:v1";

function readPlannerState(scope: string): PlannerState {
  if (typeof window === "undefined") {
    return { currentSlug: "", referenceSlug: "" };
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${scope}`);
    if (!raw) return { currentSlug: "", referenceSlug: "" };
    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    return {
      currentSlug: typeof parsed.currentSlug === "string" ? parsed.currentSlug : "",
      referenceSlug: typeof parsed.referenceSlug === "string" ? parsed.referenceSlug : "",
    };
  } catch {
    return { currentSlug: "", referenceSlug: "" };
  }
}

function writePlannerState(scope: string, state: PlannerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${scope}`, JSON.stringify(state));
}

function ProjectMiniCard({
  title,
  eyebrow,
  project,
}: {
  title: string;
  eyebrow: string;
  project: Project | null;
}) {
  if (!project) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
        <p className="text-xs text-muted">{eyebrow}</p>
        <h3 className="mt-2 font-title text-xl tracking-tight">{title}</h3>
        <p className="mt-3 text-sm text-muted">Selecione um projeto para preencher este quadro.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-4xl border border-border/70 bg-background/25">
      <div className="relative aspect-[4/3] bg-surface">
        <ProjectImage
          src={project.mainImage}
          alt={`Projeto ${project.title}`}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 20vw, 100vw"
        />
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs text-muted">{eyebrow}</p>
          <h3 className="mt-2 font-title text-xl tracking-tight">{project.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {project.carModel} - {project.year}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.style}</Badge>
          <Badge>{project.status}</Badge>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={buildProjectHref(project.slug)}>
            Abrir projeto
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function InspirationPlanner({
  mode,
  storageScope,
  currentProjects = [],
  inspirationProjects,
  referenceSourceLabel,
}: {
  mode: "local" | "supabase";
  storageScope: string;
  currentProjects?: Project[];
  inspirationProjects: Project[];
  referenceSourceLabel: string;
}) {
  const localProjects = React.useSyncExternalStore<Project[]>(
    subscribeLocalProjects,
    getLocalProjects,
    () => []
  );
  const activeProjects = mode === "local" ? localProjects : currentProjects;
  const inspirationOptions = React.useMemo(
    () =>
      inspirationProjects.filter(
        (project, index, list) => list.findIndex((entry) => entry.slug === project.slug) === index
      ),
    [inspirationProjects]
  );

  const [plannerState, setPlannerState] = React.useState<PlannerState>(() =>
    readPlannerState(storageScope)
  );
  const referenceSelectRef = React.useRef<HTMLSelectElement>(null);
  const normalizedPlannerState = React.useMemo(() => {
    const validCurrent =
      activeProjects.find((project) => project.slug === plannerState.currentSlug)?.slug ??
      activeProjects[0]?.slug ??
      "";
    const referencePool = inspirationOptions.filter((project) => project.slug !== validCurrent);
    const validReference =
      referencePool.find((project) => project.slug === plannerState.referenceSlug)?.slug ?? "";

    return {
      currentSlug: validCurrent,
      referenceSlug: validReference,
    };
  }, [activeProjects, inspirationOptions, plannerState.currentSlug, plannerState.referenceSlug]);

  React.useEffect(() => {
    if (normalizedPlannerState.referenceSlug || plannerState.referenceSlug) {
      writePlannerState(storageScope, normalizedPlannerState);
    }
  }, [normalizedPlannerState, plannerState, storageScope]);

  const currentProject =
    activeProjects.find((project) => project.slug === normalizedPlannerState.currentSlug) ?? null;
  const referenceProject =
    inspirationOptions.find((project) => project.slug === normalizedPlannerState.referenceSlug) ?? null;
  const hasReference = Boolean(referenceProject);
  const referenceOptions = React.useMemo(
    () => inspirationOptions.filter((project) => project.slug !== normalizedPlannerState.currentSlug),
    [inspirationOptions, normalizedPlannerState.currentSlug]
  );
  const analysis = React.useMemo(
    () => (hasReference ? analyzeProjectInspiration(currentProject, referenceProject) : null),
    [currentProject, hasReference, referenceProject]
  );

  if (!activeProjects.length) {
    return (
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Ferramenta privada</Badge>
          <Badge>Inspiracao do projeto</Badge>
        </div>
        <h2 className="mt-4 font-title text-2xl tracking-tight">
          Similaridade com inspiracao
        </h2>
        <p className="mt-2 text-sm text-muted">
          A comparacao com uma build de referencia aparece aqui dentro da sua garagem, nao
          na pagina publica do projeto.
        </p>
        <div className="mt-5 rounded-4xl border border-border/70 bg-background/25 p-5">
          <p className="font-ui text-sm font-semibold text-foreground">
            Adicione um carro primeiro para liberar o planejamento privado.
          </p>
          <p className="mt-2 text-sm text-muted">
            Depois voce podera comparar o estado atual do projeto com uma inspiracao
            escolhida, ver itens alinhados e identificar o que ainda falta.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/criar-projeto">Adicionar meu projeto</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!inspirationOptions.length) {
    return (
      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Ferramenta privada</Badge>
          <Badge>Inspiracao do projeto</Badge>
        </div>
        <h2 className="mt-4 font-title text-2xl tracking-tight">
          Similaridade com inspiracao
        </h2>
        <p className="mt-2 text-sm text-muted">
          Salve alguns projetos ou explore a comunidade para escolher uma referencia de build.
        </p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/explorar">Explorar projetos</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Ferramenta privada</Badge>
            <Badge>Inspiracao do projeto</Badge>
            <Badge>{referenceSourceLabel}</Badge>
          </div>
          <h2 className="mt-4 font-title text-2xl tracking-tight md:text-3xl">
            Similaridade com inspiracao
          </h2>
          <p className="mt-2 text-sm text-muted">
            Selecione um projeto salvo ou publico para usar como referencia da sua build.
          </p>
        </div>

        {analysis ? (
          <div className="rounded-4xl border border-accent/20 bg-accent/10 px-5 py-4 lg:min-w-80">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Parecido com a referencia
            </p>
            <p className="mt-2 font-title text-5xl tracking-tight">
              {analysis.percent}%
            </p>
            <p className="mt-2 text-sm text-muted">
              Seu projeto esta {analysis.percent}% parecido com a inspiracao escolhida.
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{analysis.matchedCriteria} itens alinhados</span>
              <span>{Math.max(0, analysis.totalCriteria - analysis.matchedCriteria)} itens faltando</span>
            </div>
          </div>
        ) : (
          <div className="rounded-4xl border border-border/70 bg-background/25 px-5 py-4 lg:min-w-80">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Inspiracao pendente
            </p>
            <p className="mt-2 font-ui text-sm font-semibold text-foreground">
              Escolher inspiracao
            </p>
            <p className="mt-2 text-sm text-muted">
              Selecione um projeto salvo ou publico para usar como referencia da sua build.
            </p>
            <div className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => referenceSelectRef.current?.focus()}>
                Escolher inspiracao
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <label className="grid gap-2 text-sm text-muted">
          Meu projeto atual
          <select
            value={normalizedPlannerState.currentSlug}
            onChange={(event) =>
              setPlannerState({
                currentSlug: event.target.value,
                referenceSlug:
                  normalizedPlannerState.referenceSlug === event.target.value
                    ? ""
                    : normalizedPlannerState.referenceSlug,
              })
            }
            className="pg-control h-12 rounded-3xl px-4 text-sm"
          >
            {activeProjects.map((project) => (
              <option key={project.slug} value={project.slug}>
                {project.title}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-muted">
          Build inspiracao
          <select
            ref={referenceSelectRef}
            value={normalizedPlannerState.referenceSlug}
            onChange={(event) =>
              setPlannerState((current) => ({
                ...current,
                referenceSlug: event.target.value,
              }))
            }
            className="pg-control h-12 rounded-3xl px-4 text-sm"
          >
            <option value="">Nenhuma inspiracao selecionada</option>
            {referenceOptions
              .map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.title}
                </option>
              ))}
          </select>
        </label>
      </div>

      {analysis ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10">
                <Target className="size-5 text-accent" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">
                  Leitura privada
                </p>
                <p className="mt-1 font-ui text-sm font-semibold text-foreground">
                  Ferramenta de planejamento pessoal
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Itens alinhados com a inspiracao</p>
                <p className="mt-1 font-title text-3xl">
                  {analysis.alignedItems.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Itens que ainda faltam</p>
                <p className="mt-1 font-title text-3xl">
                  {analysis.missingItems.length.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-background/25 p-4 text-sm text-muted">
                Use esta comparacao para decidir as proximas pecas, tags e direcao visual do
                projeto. A pagina publica continua mostrando estado atual, fotos e ultima
                atualizacao.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ProjectMiniCard title="Seu projeto" eyebrow="Base atual" project={currentProject} />
            <ProjectMiniCard title="Build inspiracao" eyebrow="Referencia escolhida" project={referenceProject} />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-4xl border border-border/70 bg-background/20 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-3xl border border-accent/20 bg-accent/10">
              <Target className="size-5 text-accent" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">
                Leitura privada
              </p>
              <h3 className="mt-1 font-title text-xl tracking-tight">Escolher inspiracao</h3>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            Selecione um projeto salvo ou publico para usar como referencia da sua build.
          </p>
          <div className="mt-4">
            <Button type="button" variant="outline" onClick={() => referenceSelectRef.current?.focus()}>
              Escolher inspiracao
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ProjectMiniCard title="Seu projeto" eyebrow="Base atual" project={currentProject} />
            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <p className="text-xs text-muted">Referencia</p>
              <h3 className="mt-2 font-title text-xl tracking-tight">
                Nenhuma inspiracao selecionada
              </h3>
              <p className="mt-3 text-sm text-muted">
                Escolha uma build no seletor acima para iniciar a comparacao.
              </p>
            </div>
          </div>
        </div>
      )}

      {analysis ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-accent" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">
                  Itens alinhados
                </p>
                <h3 className="mt-1 font-title text-xl tracking-tight">
                  O que ja bate com a build inspiracao
                </h3>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {analysis.alignedItems.length ? (
                analysis.alignedItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span>{item.label}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-4 text-sm text-muted">
                  Ainda nao encontramos itens claramente alinhados com essa referencia.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-accent" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">
                  Proximos passos
                </p>
                <h3 className="mt-1 font-title text-xl tracking-tight">
                  O que ainda falta para chegar na referencia
                </h3>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {analysis.missingItems.length ? (
                analysis.missingItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" />
                      <span>{item.label}</span>
                    </div>
                    {item.planned ? <Badge variant="secondary">Ja planejado</Badge> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-4 text-sm text-muted">
                  Seu projeto ja espelha muito bem essa referencia neste recorte atual.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
