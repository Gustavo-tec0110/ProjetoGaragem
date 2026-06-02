"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createCarAction,
  initialActionState,
  updateCarAction,
} from "@/app/carros/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CAR_CATEGORIES, PART_CATEGORIES } from "@/lib/garage/constants";
import type { CarPartRow, CarPartStatus, CarPhotoRow, CarRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type PartDraft = {
  localId: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  status: CarPartStatus;
  priority: string;
  price_estimate: string;
  external_url: string;
  affiliate_url: string;
  store_name: string;
  product_id: string;
};

function newPart(status: CarPartStatus): PartDraft {
  return {
    localId: globalThis.crypto.randomUUID(),
    name: "",
    category: "Outros",
    brand: "",
    description: "",
    status,
    priority: status === "planned" ? "media" : "",
    price_estimate: "",
    external_url: "",
    affiliate_url: "",
    store_name: "",
    product_id: "",
  };
}

function fromPart(row: CarPartRow): PartDraft {
  return {
    localId: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand ?? "",
    description: row.description ?? "",
    status: row.status,
    priority: row.priority ?? "",
    price_estimate: row.price_estimate ? String(row.price_estimate) : "",
    external_url: row.external_url ?? "",
    affiliate_url: row.affiliate_url ?? "",
    store_name: row.store_name ?? "",
    product_id: row.product_id ?? "",
  };
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
    <label className={cn("grid gap-2 text-sm text-muted", className)}>
      {label}
      {children}
    </label>
  );
}

export function CarForm({
  mode,
  car,
  parts = [],
  photos = [],
}: {
  mode: "create" | "edit";
  car?: CarRow | null;
  parts?: CarPartRow[];
  photos?: CarPhotoRow[];
}) {
  const action = mode === "edit" ? updateCarAction : createCarAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [photoUrls, setPhotoUrls] = React.useState<string[]>(() => {
    const fromPhotos = photos.map((photo) => photo.url);
    const fromCar = car?.photo_urls ?? [];
    return Array.from(new Set([...fromPhotos, ...fromCar])).filter((url) => url !== car?.main_photo_url);
  });
  const [draftParts, setDraftParts] = React.useState<PartDraft[]>(() => {
    const existing = parts.map(fromPart);
    return existing.length ? existing : [newPart("installed"), newPart("installed"), newPart("installed"), newPart("planned")];
  });

  function updatePart(localId: string, patch: Partial<PartDraft>) {
    setDraftParts((current) =>
      current.map((part) => (part.localId === localId ? { ...part, ...patch } : part))
    );
  }

  function removePart(localId: string) {
    setDraftParts((current) => current.filter((part) => part.localId !== localId));
  }

  const serializedParts = JSON.stringify(
    draftParts
      .filter((part) => part.name.trim())
      .map((part) => ({
        name: part.name,
        category: part.category,
        brand: part.brand,
        description: part.description,
        status: part.status,
        priority: part.priority,
        price_estimate: part.price_estimate,
        external_url: part.external_url,
        affiliate_url: part.affiliate_url,
        store_name: part.store_name,
        product_id: part.product_id,
      }))
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="car_id" value={car?.id ?? ""} />
      <input type="hidden" name="photo_urls_json" value={JSON.stringify(photoUrls.filter(Boolean))} />
      <input type="hidden" name="parts_json" value={serializedParts} />

      <Card className="p-5 md:p-6">
        <p className="text-xs text-muted">Ficha publica do carro</p>
        <h1 className="mt-2 font-title text-2xl md:text-3xl tracking-tight">
          {mode === "edit" ? "Editar carro" : "Adicionar meu carro"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Preencha o essencial agora. Voce pode evoluir a ficha depois.
        </p>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome do projeto">
              <Input name="name" defaultValue={car?.name ?? ""} placeholder="Gol G3 Turbo" required />
            </Field>
            {mode === "edit" ? (
              <Field label="Slug publico">
                <Input name="slug" defaultValue={car?.slug ?? ""} required />
              </Field>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Marca">
              <Input name="brand" defaultValue={car?.brand ?? ""} placeholder="Volkswagen" required />
            </Field>
            <Field label="Modelo">
              <Input name="model" defaultValue={car?.model ?? ""} placeholder="Gol G3" required />
            </Field>
            <Field label="Ano">
              <Input name="year" type="number" defaultValue={car?.year ?? ""} min={1900} max={2100} required />
            </Field>
            <Field label="Versao">
              <Input name="version" defaultValue={car?.version ?? ""} placeholder="1.8 AP" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Categoria">
              <select name="category" defaultValue={car?.category ?? "Nacional"} className="pg-control h-12 rounded-3xl px-4 text-sm">
                {CAR_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cidade">
              <Input name="city" defaultValue={car?.city ?? ""} placeholder="Curitiba" />
            </Field>
            <Field label="Estado">
              <Input name="state" defaultValue={car?.state ?? ""} placeholder="PR" maxLength={2} />
            </Field>
          </div>

          <Field label="Descricao curta">
            <textarea
              name="description"
              defaultValue={car?.description ?? ""}
              className="pg-control min-h-28 w-full resize-none rounded-3xl px-4 py-3 text-sm"
              placeholder="Conte o objetivo do projeto, uso principal e o que ja foi feito."
            />
          </Field>

          <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
            <input
              type="checkbox"
              name="is_public"
              value="true"
              defaultChecked={car?.is_public ?? true}
              className="size-4 accent-red-500"
            />
            Pagina publica e indexavel
          </label>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="font-title text-xl tracking-tight">Fotos</h2>
        <div className="mt-4 grid gap-4">
          <Field label="Foto principal">
            <Input name="main_photo_url" defaultValue={car?.main_photo_url ?? ""} placeholder="https://..." />
          </Field>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">Fotos secundarias</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPhotoUrls((current) => [...current, ""])}
              >
                <Plus className="size-4" />
                Foto
              </Button>
            </div>
            {photoUrls.length ? (
              photoUrls.map((url, index) => (
                <div key={`${index}-${url}`} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(event) =>
                      setPhotoUrls((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                      )
                    }
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remover foto"
                    onClick={() => setPhotoUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
                Sem fotos secundarias por enquanto.
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="font-title text-xl tracking-tight">Especificacoes</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Motor">
            <Input name="engine" defaultValue={car?.engine ?? ""} placeholder="AP 1.8 Turbo" />
          </Field>
          <Field label="Potencia cv">
            <Input name="power_cv" type="number" defaultValue={car?.power_cv ?? ""} />
          </Field>
          <Field label="Combustivel">
            <Input name="fuel_type" defaultValue={car?.fuel_type ?? ""} placeholder="Flex, gasolina..." />
          </Field>
          <Field label="Cambio">
            <Input name="transmission" defaultValue={car?.transmission ?? ""} />
          </Field>
          <Field label="Tracao">
            <Input name="drivetrain" defaultValue={car?.drivetrain ?? ""} placeholder="Dianteira" />
          </Field>
          <Field label="Suspensao">
            <Input name="suspension" defaultValue={car?.suspension ?? ""} />
          </Field>
          <Field label="Rodas">
            <Input name="wheels" defaultValue={car?.wheels ?? ""} />
          </Field>
          <Field label="Pneus">
            <Input name="tires" defaultValue={car?.tires ?? ""} />
          </Field>
          <Field label="Freios">
            <Input name="brakes" defaultValue={car?.brakes ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-title text-xl tracking-tight">Pecas instaladas e planejadas</h2>
            <p className="mt-1 text-sm text-muted">
              Links externos ficam preparados para afiliados no futuro.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDraftParts((current) => [...current, newPart("installed")])}>
              <Plus className="size-4" />
              Instalada
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setDraftParts((current) => [...current, newPart("planned")])}>
              <Plus className="size-4" />
              Planejada
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {draftParts.map((part) => (
            <div key={part.localId} className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <div className="grid gap-3 md:grid-cols-5">
                <Field label="Status">
                  <select
                    value={part.status}
                    onChange={(event) => updatePart(part.localId, { status: event.target.value as CarPartStatus })}
                    className="pg-control h-12 rounded-3xl px-4 text-sm"
                  >
                    <option value="installed">Instalada</option>
                    <option value="planned">Planejada</option>
                  </select>
                </Field>
                <Field label="Nome" className="md:col-span-2">
                  <Input value={part.name} onChange={(event) => updatePart(part.localId, { name: event.target.value })} placeholder="Turbina .50" />
                </Field>
                <Field label="Categoria">
                  <select
                    value={part.category}
                    onChange={(event) => updatePart(part.localId, { category: event.target.value })}
                    className="pg-control h-12 rounded-3xl px-4 text-sm"
                  >
                    {PART_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Marca">
                  <Input value={part.brand} onChange={(event) => updatePart(part.localId, { brand: event.target.value })} />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Field label="Preco estimado">
                  <Input inputMode="numeric" value={part.price_estimate} onChange={(event) => updatePart(part.localId, { price_estimate: event.target.value })} placeholder="2500" />
                </Field>
                <Field label="Prioridade">
                  <Input value={part.priority} onChange={(event) => updatePart(part.localId, { priority: event.target.value })} placeholder="alta, media..." />
                </Field>
                <Field label="Loja">
                  <Input value={part.store_name} onChange={(event) => updatePart(part.localId, { store_name: event.target.value })} />
                </Field>
                <Field label="Link externo">
                  <Input value={part.external_url} onChange={(event) => updatePart(part.localId, { external_url: event.target.value })} placeholder="https://..." />
                </Field>
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  value={part.description}
                  onChange={(event) => updatePart(part.localId, { description: event.target.value })}
                  placeholder="Observacao rapida"
                />
                <Button type="button" variant="outline" size="icon" aria-label="Remover peca" onClick={() => removePart(part.localId)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {state.status === "error" ? (
        <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-[calc(88px+env(safe-area-inset-bottom))] z-20 md:static">
        <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {mode === "edit" ? "Salve para atualizar a pagina publica." : "Ao salvar, o link publico do carro sera criado."}
          </p>
          <Button type="submit" disabled={pending} className="sm:min-w-48">
            {pending ? "Salvando..." : mode === "edit" ? "Salvar alteracoes" : "Criar pagina do carro"}
          </Button>
        </Card>
      </div>
    </form>
  );
}
