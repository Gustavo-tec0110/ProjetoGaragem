"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { CarForm } from "@/components/garage/car-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CAR_CATEGORIES, normalizeSlug } from "@/lib/garage/constants";
import type { CarCatalogVersion } from "@/lib/car-catalog";
import { saveLocalProject } from "@/lib/projects/local-storage";
import {
  PROJECT_STATUS_VALUES,
  type ProjectPart,
  type ProjectSeed,
} from "@/lib/projects/types";
import { buildProjectHref, enrichProject, parseTagString } from "@/lib/projects/utils";

function textareaLines(value: string, status: "installed" | "planned") {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map<ProjectPart>((line, index) => ({
      id: `${status}-${index}-${normalizeSlug(line)}`,
      name: line,
      category: "Outros",
      brand: null,
      description: null,
      status,
      priceEstimate: null,
    }));
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm text-muted ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

export function ProjectForm({
  storageMode,
  catalogVersions,
}: {
  storageMode: "supabase" | "local";
  catalogVersions?: CarCatalogVersion[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState("");

  if (storageMode === "supabase") {
    return <CarForm mode="create" catalogVersions={catalogVersions ?? []} />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const ownerName = String(formData.get("owner_name") ?? "").trim() || "Sua garagem";
    const carModel = String(formData.get("car_model") ?? "").trim();
    const yearValue = Number.parseInt(String(formData.get("year") ?? ""), 10);
    const engine = String(formData.get("engine") ?? "").trim();
    const style = String(formData.get("style") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const mainImage = String(formData.get("main_image") ?? "").trim();
    const fallbackDescription = `Projeto ${carModel} criado para completar a ficha com calma.`;
    const status = String(formData.get("status") ?? "").trim() || "Em andamento";
    const estimatedCostRaw = String(formData.get("estimated_cost") ?? "").trim();
    const estimatedCost = estimatedCostRaw
      ? Number.parseInt(estimatedCostRaw.replace(/[^\d]/g, ""), 10)
      : null;
    const tags = parseTagString(String(formData.get("tags") ?? ""));

    if (!title || !carModel || !Number.isFinite(yearValue) || !mainImage) {
      setError("Preencha nome do projeto, carro, ano e foto principal.");
      return;
    }

    const installedParts = textareaLines(
      String(formData.get("installed_parts") ?? ""),
      "installed"
    );
    const plannedParts = textareaLines(
      String(formData.get("planned_parts") ?? ""),
      "planned"
    );

    const slug = `${normalizeSlug(`${title}-${carModel}`)}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const project: ProjectSeed = {
      id: slug,
      slug,
      source: "local",
      databaseId: null,
      ownerId: null,
      ownerName,
      ownerUsername: null,
      title,
      carModel,
      brand: carModel.split(" ")[0] ?? null,
      model: carModel,
      year: yearValue,
      engine: engine || "Ficha a confirmar",
      style: style || "Projeto automotivo",
      shortDescription: (description || fallbackDescription).slice(0, 140),
      description: description || fallbackDescription,
      mainImage,
      gallery: [mainImage].filter(Boolean),
      installedParts,
      plannedParts,
      estimatedCost,
      status,
      likes: 0,
      saves: 0,
      views: 0,
      comments: 0,
      tags: tags.length ? tags : [style || "Projeto automotivo", engine.split(" ")[0] ?? "Projeto", "#local"],
      startedAt: String(formData.get("started_at") ?? "").trim() || null,
      projectGoal: String(formData.get("project_goal") ?? "").trim() || description.slice(0, 80),
      city: null,
      state: null,
      createdAt: now,
      updatedAt: now,
      isPublic: true,
      viewerHasLiked: false,
      viewerHasSaved: false,
      editHref: null,
    };

    const normalizedProject = enrichProject(project);
    saveLocalProject(normalizedProject);
    router.push(buildProjectHref(normalizedProject.slug));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-5 md:p-6">
        <p className="text-xs text-warning">Modo demo/local</p>
        <h1 className="mt-2 font-title text-2xl tracking-tight md:text-3xl">
          Adicionar projeto sem Supabase
        </h1>
        <p className="mt-2 text-sm text-muted">
          A ficha fica salva neste navegador para voce validar o MVP antes de ligar o banco.
        </p>
      </Card>

      <Card className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
        <Field label="Nome do projeto">
          <Input name="title" placeholder="Gol Quadrado 1994 AP 1.8" required />
        </Field>
        <Field label="Seu nome ou apelido">
          <Input name="owner_name" placeholder="Sua garagem" />
        </Field>
        <Field label="Carro">
          <Input name="car_model" placeholder="Volkswagen Gol Quadrado" required />
        </Field>
        <Field label="Ano">
          <Input name="year" type="number" min={1900} max={2100} required />
        </Field>
        <Field label="Motor">
          <Input name="engine" placeholder="AP 1.8, Fire 1.0 turbo..." />
        </Field>
        <Field label="Estilo">
          <select
            name="style"
            defaultValue=""
            className="pg-control h-12 rounded-3xl px-4 text-sm"
          >
            <option value="" disabled>
              Escolha um estilo
            </option>
            {CAR_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Imagem principal">
          <Input name="main_image" placeholder="https://..." required />
        </Field>
        <Field label="Custo aproximado">
          <Input name="estimated_cost" inputMode="numeric" placeholder="15000" />
        </Field>
        <Field label="Status do projeto">
          <select
            name="status"
            defaultValue="Em andamento"
            className="pg-control h-12 rounded-3xl px-4 text-sm"
          >
            {PROJECT_STATUS_VALUES.map((projectStatus) => (
              <option key={projectStatus} value={projectStatus}>
              {projectStatus}
            </option>
          ))}
          </select>
        </Field>
        <Field label="Inicio do projeto">
          <Input name="started_at" type="date" />
        </Field>
        <Field label="Tags" className="md:col-span-2">
          <Input name="tags" placeholder="#turbo, #quadrado, #trackday" />
        </Field>
        <Field label="Meta do projeto" className="md:col-span-2">
          <Input name="project_goal" placeholder="Projeto OEM+, turbo de rua, track day..." />
        </Field>
        <Field label="Descricao" className="md:col-span-2">
          <textarea
            name="description"
            className="pg-control min-h-32 w-full rounded-3xl px-4 py-3 text-sm"
            placeholder="Conte o objetivo do projeto, o uso e o que ja foi feito."
          />
        </Field>
        <Field label="Pecas instaladas (uma por linha)">
          <textarea
            name="installed_parts"
            className="pg-control min-h-32 w-full rounded-3xl px-4 py-3 text-sm"
            placeholder="Coilover&#10;Escape inox&#10;Rodas aro 15"
          />
        </Field>
        <Field label="Pecas planejadas (uma por linha)">
          <textarea
            name="planned_parts"
            className="pg-control min-h-32 w-full rounded-3xl px-4 py-3 text-sm"
            placeholder="Wideband&#10;Freio maior&#10;Remap"
          />
        </Field>
      </Card>

      {error ? (
        <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          O projeto sera salvo localmente e abrira a pagina individual em seguida.
        </p>
        <Button type="submit" className="sm:min-w-48">
          Criar projeto local
        </Button>
      </Card>
    </form>
  );
}
