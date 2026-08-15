"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Gauge, HelpCircle, Plus, Trash2 } from "lucide-react";

import {
  deleteCarAction,
  type ActionState,
} from "@/app/carros/actions";
import { ProjectImageUploader } from "@/components/garage/project-image-uploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CAR_BRANDS, CAR_CATEGORIES, PART_CATEGORIES } from "@/lib/garage/constants";
import {
  calculateSpecConfidence,
  DETAIL_ANSWER_OPTIONS,
  factorySpecSummary,
  FALLBACK_CAR_CATALOG,
  INDUCTION_OPTIONS,
  matchingCatalogVersions,
  UNKNOWN_VERSION_VALUE,
  type CarCatalogVersion,
  type DataConfidence,
} from "@/lib/car-catalog";
import {
  PROJECT_EXPENSE_CATEGORIES,
  PROJECT_STATUS_VALUES,
} from "@/lib/projects/types";
import { parseTagString } from "@/lib/projects/utils";
import type {
  CarBuildUpdateRow,
  CarExpenseRow,
  CarPartRow,
  CarPartStatus,
  CarPhotoRow,
  CarRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const UPDATE_CATEGORIES = [
  { value: "manutencao", label: "Manutenção" },
  { value: "estetica", label: "Estética" },
  { value: "performance", label: "Performance" },
  { value: "interior", label: "Interior" },
  { value: "suspensao", label: "Suspensão" },
  { value: "rodas", label: "Rodas" },
  { value: "motor", label: "Motor" },
  { value: "eletrica", label: "Elétrica" },
  { value: "compra", label: "Compra" },
  { value: "antes_depois", label: "Antes e depois" },
  { value: "outro", label: "Outro" },
] as const;

type CarBrand = (typeof CAR_BRANDS)[number];

const OTHER_MODEL_VALUE = "__other__";
const OTHER_VERSION_VALUE = "__other_version__";

const CAR_MODELS_BY_BRAND: Record<CarBrand, readonly string[]> = {
  Volkswagen: ["Gol", "Golf", "Parati", "Saveiro", "Voyage", "Santana", "Passat", "Polo", "Fox", "Fusca", "Jetta"],
  Chevrolet: ["Corsa", "Celta", "Classic", "Monza", "Kadett", "Opala", "Chevette", "Astra", "Vectra", "Omega", "S10"],
  Fiat: ["Uno", "Palio", "Siena", "Strada", "Tempra", "Tipo", "Marea", "Punto", "Bravo", "147"],
  Ford: ["Escort", "Fiesta", "Ka", "Focus", "Fusion", "Ranger", "Corcel", "Del Rey", "Maverick"],
  Honda: ["Civic", "Accord", "Fit", "City", "CR-V"],
  Toyota: ["Corolla", "Hilux", "SW4", "Etios", "Yaris"],
  Nissan: ["Sentra", "March", "Versa", "Frontier", "Kicks"],
  Renault: ["Clio", "Sandero", "Logan", "Megane", "Duster"],
  Peugeot: ["206", "207", "208", "307", "308", "408"],
  Citroën: ["C3", "C4", "Xsara", "Xantia", "Aircross"],
  Hyundai: ["HB20", "Tucson", "i30", "Elantra", "Santa Fe"],
  Mitsubishi: ["Lancer", "Pajero", "Eclipse", "ASX", "L200"],
  Audi: ["A3", "A4", "A5", "A6", "TT", "Q3", "Q5"],
  BMW: ["Série 3", "Série 5", "Série 1", "X1", "X3", "Z4"],
  "Mercedes-Benz": ["Classe A", "Classe C", "Classe E", "CLA", "GLA"],
};

const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

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
  installed_at: string;
  image_url: string;
};

type UpdateDraft = {
  localId: string;
  title: string;
  description: string;
  photo_url: string;
  photo_urls: string[];
  category: string;
  happened_at: string;
  amount_spent: string;
};

type ExpenseDraft = {
  localId: string;
  name: string;
  category: string;
  amount: string;
  spent_at: string;
  note: string;
  part_name: string;
  is_public: boolean;
};

function uid() {
  return globalThis.crypto.randomUUID();
}

function safeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function isoDate(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function realCatalogId(version: CarCatalogVersion | null) {
  if (!version || version.id.startsWith("fallback-")) return "";
  return version.id;
}

function newPart(status: CarPartStatus): PartDraft {
  return {
    localId: uid(),
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
    installed_at: "",
    image_url: "",
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
    installed_at: isoDate(row.installed_at),
    image_url: row.image_url ?? "",
  };
}

function newUpdate(): UpdateDraft {
  return {
    localId: uid(),
    title: "",
    description: "",
    photo_url: "",
    photo_urls: [],
    category: "outro",
    happened_at: isoDate(new Date().toISOString()),
    amount_spent: "",
  };
}

function fromUpdate(row: CarBuildUpdateRow): UpdateDraft {
  return {
    localId: row.id,
    title: row.title,
    description: row.description ?? "",
    photo_url: row.photo_url ?? "",
    photo_urls: safeStringArray(row.photo_urls),
    category: row.category ?? "outro",
    happened_at: isoDate(row.happened_at),
    amount_spent: row.amount_spent ? String(row.amount_spent) : "",
  };
}

function newExpense(): ExpenseDraft {
  return {
    localId: uid(),
    name: "",
    category: "Outros",
    amount: "",
    spent_at: isoDate(new Date().toISOString()),
    note: "",
    part_name: "",
    is_public: true,
  };
}

function fromExpense(row: CarExpenseRow): ExpenseDraft {
  return {
    localId: row.id,
    name: row.name,
    category: row.category,
    amount: String(row.amount),
    spent_at: isoDate(row.spent_at),
    note: row.note ?? "",
    part_name: row.part_name ?? "",
    is_public: row.is_public,
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

function modelOptionsForBrand(brand: string) {
  return CAR_MODELS_BY_BRAND[brand as CarBrand] ?? [];
}

function ModelField({
  brand,
  value,
  onChange,
  preservedValue,
}: {
  brand: string;
  value: string;
  onChange: (value: string) => void;
  preservedValue?: string | null;
}) {
  const brandModels = modelOptionsForBrand(brand);
  const preservedModel = preservedValue?.trim();
  const options =
    preservedModel && !brandModels.includes(preservedModel)
      ? [preservedModel, ...brandModels]
      : brandModels;
  const selectValue = value ? (options.includes(value) ? value : OTHER_MODEL_VALUE) : "";
  const isOther = selectValue === OTHER_MODEL_VALUE;

  return (
    <Field label="Modelo">
      <select
        name={isOther ? undefined : "model"}
        value={selectValue}
        onChange={(event) => {
          if (event.target.value === OTHER_MODEL_VALUE) {
            onChange(OTHER_MODEL_VALUE);
            return;
          }

          onChange(event.target.value);
        }}
        className="pg-control h-12 rounded-3xl px-4 text-sm"
        required
      >
        <option value="" disabled>
          {brand ? "Escolha um modelo" : "Escolha a marca primeiro"}
        </option>
        {options.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
        <option value={OTHER_MODEL_VALUE}>Outro</option>
      </select>
      {isOther ? (
        <Input
          name="model"
          value={value === OTHER_MODEL_VALUE ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Digite o modelo"
          required
        />
      ) : null}
    </Field>
  );
}

function DetailAnswerGroup({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <fieldset className="grid gap-2 text-sm text-muted">
      <legend>{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {DETAIL_ANSWER_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 items-center justify-center rounded-3xl border border-border/70 bg-background/25 px-3 text-center text-xs text-foreground"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={(defaultValue ?? "unknown") === option.value}
              className="sr-only peer"
            />
            <span className="peer-checked:text-red-400">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ProjectTagsField({
  tags,
  draft,
  onDraftChange,
  onTagsChange,
}: {
  tags: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
}) {
  const remaining = Math.max(0, 20 - tags.length);

  function addTags(value: string) {
    const nextTags = parseTagString(value);
    if (!nextTags.length) return;
    onTagsChange(Array.from(new Set([...tags, ...nextTags])).slice(0, 20));
    onDraftChange("");
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((item) => item !== tag));
  }

  return (
    <div className="grid gap-3 text-sm text-muted">
      <div className="flex items-center justify-between gap-3">
        <span>Tags do projeto</span>
        <span className="text-xs">{remaining} restantes</span>
      </div>
      <input type="hidden" name="tags_csv" value={tags.join(", ")} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={draft}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue.includes(",")) {
              addTags(nextValue);
              return;
            }

            onDraftChange(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTags(draft);
            }
          }}
          placeholder="gol quadrado, ap 1.8, turbo, orbital"
          disabled={!remaining}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => addTags(draft)}
          disabled={!draft.trim() || !remaining}
        >
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/25 px-3 py-2 text-xs text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-muted hover:text-danger"
                aria-label={`Remover ${tag}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-xs">
          Adicione termos que visitantes usariam para encontrar o carro.
        </p>
      )}
    </div>
  );
}

export function CarForm({
  mode,
  car,
  parts = [],
  photos = [],
  updates = [],
  expenses = [],
  catalogVersions = FALLBACK_CAR_CATALOG,
}: {
  mode: "create" | "edit";
  car?: CarRow | null;
  parts?: CarPartRow[];
  photos?: CarPhotoRow[];
  updates?: CarBuildUpdateRow[];
  expenses?: CarExpenseRow[];
  catalogVersions?: CarCatalogVersion[];
}) {
  const router = useRouter();
  const [editState, setEditState] = React.useState<ActionState>(initialActionState);
  const [editPending, setEditPending] = React.useState(false);
  const [createState, setCreateState] = React.useState<ActionState>(initialActionState);
  const [createPending, setCreatePending] = React.useState(false);
  const state = mode === "edit" ? editState : createState;
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteCarAction,
    initialActionState
  );
  const deleteFormRef = React.useRef<HTMLFormElement>(null);
  const [mainPhotoUrl, setMainPhotoUrl] = React.useState(car?.main_photo_url ?? "");
  const [photoUrls, setPhotoUrls] = React.useState<string[]>(() => {
    const fromPhotos = photos.map((photo) => photo.url);
    const fromCar = safeStringArray(car?.photo_urls);
    return Array.from(new Set([...fromPhotos, ...fromCar])).filter(
      (url) => url !== car?.main_photo_url
    );
  });
  const [draftParts, setDraftParts] = React.useState<PartDraft[]>(() => parts.map(fromPart));
  const [draftUpdates, setDraftUpdates] = React.useState<UpdateDraft[]>(() =>
    updates.map(fromUpdate)
  );
  const [draftExpenses, setDraftExpenses] = React.useState<ExpenseDraft[]>(() =>
    expenses.map(fromExpense)
  );
  const [partsExpanded, setPartsExpanded] = React.useState(false);
  const [timelineExpanded, setTimelineExpanded] = React.useState(false);
  const [expensesExpanded, setExpensesExpanded] = React.useState(false);
  const [tags, setTags] = React.useState<string[]>(() =>
    parseTagString(safeStringArray(car?.tags).join(", "))
  );
  const [tagDraft, setTagDraft] = React.useState("");
  const [projectNameInput, setProjectNameInput] = React.useState(car?.name ?? "");
  const [brandInput, setBrandInput] = React.useState(car?.brand ?? "");
  const [modelInput, setModelInput] = React.useState(car?.model ?? "");
  const [yearInput, setYearInput] = React.useState(car?.year ? String(car.year) : "");
  const [editManualVersion, setEditManualVersion] = React.useState(car?.version ?? "");
  const [editVersionConfidence, setEditVersionConfidence] = React.useState<DataConfidence>(
    car?.version_confidence ?? "unknown"
  );
  const [selectedCatalogId, setSelectedCatalogId] = React.useState<string>(() => {
    if (car?.catalog_version_id) return car.catalog_version_id;

    const currentVersion = car?.version?.trim();
    if (!currentVersion) return UNKNOWN_VERSION_VALUE;

    const initialMatch = matchingCatalogVersions(
      catalogVersions,
      car?.brand ?? "",
      car?.model ?? "",
      car?.year ? String(car.year) : ""
    ).find((item) => item.version.toLowerCase() === currentVersion.toLowerCase());

    return initialMatch?.id ?? OTHER_VERSION_VALUE;
  });
  const editBrandOptions = React.useMemo(() => {
    const currentBrand = car?.brand?.trim();
    if (currentBrand && !CAR_BRANDS.includes(currentBrand as (typeof CAR_BRANDS)[number])) {
      return [currentBrand, ...CAR_BRANDS];
    }

    return CAR_BRANDS;
  }, [car?.brand]);

  const catalogMatches = React.useMemo(
    () => matchingCatalogVersions(catalogVersions, brandInput, modelInput, yearInput),
    [brandInput, catalogVersions, modelInput, yearInput]
  );
  const selectedCatalogVersion =
    selectedCatalogId === UNKNOWN_VERSION_VALUE || selectedCatalogId === OTHER_VERSION_VALUE
      ? null
      : catalogMatches.find((item) => item.id === selectedCatalogId) ?? null;
  const versionSelectValue = selectedCatalogVersion
    ? selectedCatalogId
    : selectedCatalogId === OTHER_VERSION_VALUE
      ? OTHER_VERSION_VALUE
      : UNKNOWN_VERSION_VALUE;
  const suggestedFactorySpec = selectedCatalogVersion ?? catalogMatches[0] ?? null;
  const createVersionConfidence: DataConfidence = selectedCatalogVersion ? "confirmed" : "unknown";
  const createSpecConfidence: DataConfidence = suggestedFactorySpec ? "estimated" : "unknown";
  const createSpecConfidencePercent = calculateSpecConfidence({
    versionConfidence: createVersionConfidence,
  });
  const editSpecConfidencePercent = calculateSpecConfidence({
    versionConfidence: editVersionConfidence,
    originalEngineAnswer: car?.original_engine_answer ?? "unknown",
    originalInductionAnswer: car?.original_induction_answer ?? "unknown",
    originalColorAnswer: car?.original_color_answer ?? "unknown",
    originalWheelsAnswer: car?.original_wheels_answer ?? "unknown",
    originalInteriorAnswer: car?.original_interior_answer ?? "unknown",
    originalSuspensionAnswer: car?.original_suspension_answer ?? "unknown",
  });
  const editProjectProgressPercent = car?.progress_percent ?? 0;
  const isEditProjectComplete = editProjectProgressPercent >= 100;
  const editProjectHref = car?.slug ? `/projeto/${car.slug}` : null;

  function handleBrandChange(brand: string) {
    setBrandInput(brand);
    setModelInput("");
    setSelectedCatalogId(UNKNOWN_VERSION_VALUE);
    setEditManualVersion("");
    setEditVersionConfidence("unknown");
  }

  function updatePart(localId: string, patch: Partial<PartDraft>) {
    setDraftParts((current) =>
      current.map((part) => (part.localId === localId ? { ...part, ...patch } : part))
    );
  }

  function updateTimeline(localId: string, patch: Partial<UpdateDraft>) {
    setDraftUpdates((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }

  function updateExpense(localId: string, patch: Partial<ExpenseDraft>) {
    setDraftExpenses((current) =>
      current.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }

  function removePart(localId: string) {
    setDraftParts((current) => current.filter((part) => part.localId !== localId));
  }

  function removeTimeline(localId: string) {
    setDraftUpdates((current) => current.filter((item) => item.localId !== localId));
  }

  function removeExpense(localId: string) {
    setDraftExpenses((current) => current.filter((item) => item.localId !== localId));
  }

  function addPart(status: CarPartStatus) {
    setPartsExpanded(true);
    setDraftParts((current) => [...current, newPart(status)]);
  }

  function addTimelineUpdate() {
    setTimelineExpanded(true);
    setDraftUpdates((current) => [...current, newUpdate()]);
  }

  function addExpense() {
    setExpensesExpanded(true);
    setDraftExpenses((current) => [...current, newExpense()]);
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
        installed_at: part.installed_at,
        image_url: part.image_url,
      }))
  );

  const serializedUpdates = JSON.stringify(
    draftUpdates
      .filter((update) => update.title.trim())
      .map((update) => ({
        title: update.title,
        description: update.description,
        photo_url: update.photo_url,
        photo_urls: Array.from(
          new Set([update.photo_url, ...update.photo_urls].filter(Boolean))
        ),
        category: update.category,
        happened_at: update.happened_at,
        amount_spent: update.amount_spent,
      }))
  );

  const serializedExpenses = JSON.stringify(
    draftExpenses
      .filter((expense) => expense.name.trim())
      .map((expense) => ({
        name: expense.name,
        category: expense.category,
        amount: expense.amount,
        spent_at: expense.spent_at,
        note: expense.note,
        part_name: expense.part_name,
        is_public: expense.is_public,
      }))
  );

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatePending(true);
    setCreateState(initialActionState);

    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json().catch(() => null)) as
        | { status: "success"; redirectTo?: string }
        | { status: "error"; message?: string }
        | null;

      if (!response.ok || payload?.status !== "success" || !payload.redirectTo) {
        setCreateState({
          status: "error",
          message:
            payload?.status === "error" && payload.message
              ? payload.message
              : "Nao foi possivel criar o projeto.",
        });
        return;
      }

      router.push(payload.redirectTo);
    } catch {
      setCreateState({
        status: "error",
        message: "Nao foi possivel conectar ao servidor. Tente novamente.",
      });
    } finally {
      setCreatePending(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter?.dataset.intent === "delete") return;

    event.preventDefault();
    setEditPending(true);
    setEditState(initialActionState);

    try {
      const carId = car?.id ?? "";
      const response = await fetch(`/api/projects/${encodeURIComponent(carId)}/update`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json().catch(() => null)) as
        | { status: "success"; redirectTo?: string }
        | { status: "error"; message?: string }
        | null;

      if (!response.ok || payload?.status !== "success" || !payload.redirectTo) {
        setEditState({
          status: "error",
          message:
            payload?.status === "error" && payload.message
              ? payload.message
              : "Nao foi possivel salvar o projeto.",
        });
        return;
      }

      router.push(payload.redirectTo);
    } catch {
      setEditState({
        status: "error",
        message: "Nao foi possivel conectar ao servidor. Tente novamente.",
      });
    } finally {
      setEditPending(false);
    }
  }

  if (mode === "create") {
    const factorySpecs = factorySpecSummary(suggestedFactorySpec);
    const autoTags = [
      brandInput,
      modelInput,
      selectedCatalogVersion?.version,
      suggestedFactorySpec?.generationName,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <form action="/api/projects/create" method="post" onSubmit={handleCreateSubmit} className="space-y-4 md:space-y-6">
        <input type="hidden" name="main_photo_url" value={mainPhotoUrl} />
        <input
          type="hidden"
          name="photo_urls_json"
          value={JSON.stringify(photoUrls.filter(Boolean))}
        />
        <input type="hidden" name="parts_json" value="[]" />
        <input type="hidden" name="updates_json" value="[]" />
        <input type="hidden" name="expenses_json" value="[]" />
        <input type="hidden" name="tags_auto_csv" value={autoTags} />
        <input type="hidden" name="category" value="Projeto automotivo" />
        <input type="hidden" name="project_status" value="Em andamento" />
        <input type="hidden" name="is_public" value="true" />
        <input type="hidden" name="show_expenses_public" value="true" />
        <input type="hidden" name="catalog_version_id" value={realCatalogId(selectedCatalogVersion)} />
        <input type="hidden" name="version" value={selectedCatalogVersion?.version ?? ""} />
        <input type="hidden" name="version_confidence" value={createVersionConfidence} />
        <input type="hidden" name="factory_spec_confidence" value={createSpecConfidence} />
        <input
          type="hidden"
          name="factory_specs_note"
          value={
            suggestedFactorySpec?.notes ??
            (catalogMatches.length ? "Versão não confirmada pelo dono." : "")
          }
        />
        <input type="hidden" name="factory_engine" value={suggestedFactorySpec?.engineOriginal ?? ""} />
        <input type="hidden" name="factory_induction" value={suggestedFactorySpec?.inductionOriginal ?? ""} />
        <input type="hidden" name="factory_power_cv" value={suggestedFactorySpec?.powerHp ?? ""} />
        <input
          type="hidden"
          name="factory_transmission"
          value={suggestedFactorySpec?.transmission ?? ""}
        />
        <input
          type="hidden"
          name="factory_drivetrain"
          value={suggestedFactorySpec?.drivetrain ?? ""}
        />
        <input
          type="hidden"
          name="spec_confidence_percent"
          value={String(createSpecConfidencePercent)}
        />
        <input type="hidden" name="engine" value={suggestedFactorySpec?.engineOriginal ?? ""} />
        <input type="hidden" name="power_cv" value={suggestedFactorySpec?.powerHp ?? ""} />
        <input type="hidden" name="fuel_type" value={suggestedFactorySpec?.fuelType ?? ""} />
        <input
          type="hidden"
          name="transmission"
          value={suggestedFactorySpec?.transmission ?? ""}
        />
        <input
          type="hidden"
          name="drivetrain"
          value={suggestedFactorySpec?.drivetrain ?? ""}
        />
        <input
          type="hidden"
          name="current_induction"
          value={suggestedFactorySpec?.inductionOriginal ?? ""}
        />
        <input type="hidden" name="original_engine_answer" value="unknown" />
        <input type="hidden" name="original_induction_answer" value="unknown" />
        <input type="hidden" name="original_color_answer" value="unknown" />
        <input type="hidden" name="original_wheels_answer" value="unknown" />
        <input type="hidden" name="original_interior_answer" value="unknown" />
        <input type="hidden" name="original_suspension_answer" value="unknown" />

        <Card className="p-4 md:p-6">
          <p className="text-xs text-warning">Cadastro simples</p>
          <h1 className="mt-2 font-title text-2xl tracking-tight md:text-3xl">
            Crie o projeto com o que você sabe agora
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Marca, modelo, ano e nome bastam. A foto e a parte tecnica podem ser confirmadas depois.
          </p>

          <div className="mt-4 grid gap-3 md:mt-6 md:gap-4">
            <Field label="Nome do projeto">
              <Input
                name="name"
                value={projectNameInput}
                onChange={(event) => setProjectNameInput(event.target.value)}
                placeholder="Gol do Gustavo"
                required
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              <Field label="Marca">
                <select
                  name="brand"
                  value={brandInput}
                  onChange={(event) => handleBrandChange(event.target.value)}
                  className="pg-control h-12 rounded-3xl px-4 text-sm"
                  required
                >
                  <option value="" disabled>
                    Escolha uma marca
                  </option>
                  {CAR_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </Field>
              <ModelField brand={brandInput} value={modelInput} onChange={setModelInput} />
              <Field label="Ano">
                <Input
                  name="year"
                  type="number"
                  value={yearInput}
                  onChange={(event) => setYearInput(event.target.value)}
                  min={1900}
                  max={2100}
                  placeholder="1994"
                  required
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="font-title text-xl tracking-tight">Foto principal</h2>
          <p className="mt-1 text-sm text-muted">
            Opcional agora. Use upload real ou URL como fallback quando tiver uma foto pronta.
          </p>
          <div className="mt-4">
            <ProjectImageUploader
              mainPhotoUrl={mainPhotoUrl}
              photoUrls={photoUrls}
              onMainPhotoChange={setMainPhotoUrl}
              onPhotoUrlsChange={setPhotoUrls}
            />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <ProjectTagsField
            tags={tags}
            draft={tagDraft}
            onDraftChange={setTagDraft}
            onTagsChange={setTags}
          />
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-1 size-5 text-warning" />
            <div>
              <h2 className="font-title text-xl tracking-tight">Versão do carro</h2>
              <p className="mt-1 text-sm text-muted">
                Se não souber a versão, escolha “Não sei”. O projeto será criado mesmo assim.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {catalogMatches.length ? (
              <Field label={`${brandInput} ${modelInput} ${yearInput}: versões possíveis`}>
                <select
                  value={versionSelectValue}
                  onChange={(event) => setSelectedCatalogId(event.target.value)}
                  className="pg-control h-12 rounded-3xl px-4 text-sm"
                >
                  <option value={UNKNOWN_VERSION_VALUE}>Não sei</option>
                  {catalogMatches.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.version}
                      {version.generationName ? ` - ${version.generationName}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            ) : brandInput && modelInput && yearInput ? (
              <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-4 text-sm text-muted">
                Ainda não temos uma referência para esse modelo/ano. Você pode criar o projeto e
                completar os detalhes depois.
              </div>
            ) : (
              <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-4 text-sm text-muted">
                Preencha marca, modelo e ano para ver sugestões de versão quando existirem.
              </div>
            )}

            {suggestedFactorySpec ? (
              <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-warning">
                      Dados de fábrica estimados, ainda não confirmados
                    </p>
                    <h3 className="mt-1 font-title text-lg tracking-tight">
                      {suggestedFactorySpec.brand} {suggestedFactorySpec.model}{" "}
                      {selectedCatalogVersion?.version ?? "versão não confirmada"}
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs text-muted">
                    <Gauge className="size-4 text-red-400" />
                    Detalhes {createSpecConfidencePercent}% respondidos
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {factorySpecs.map(([label, value]) => (
                    <div key={label} className="rounded-3xl border border-border/60 px-4 py-3">
                      <p className="text-xs text-muted">{label}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                {suggestedFactorySpec.notes ? (
                  <p className="mt-3 text-xs text-muted">{suggestedFactorySpec.notes}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="font-title text-xl tracking-tight">Depois de publicar</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-5">
            {[
              "Adicionar versão",
              "Confirmar mecânica",
              "Adicionar fotos",
              "Adicionar modificações",
              "Registrar timeline",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2.5 text-xs text-muted sm:px-4 sm:py-3 sm:text-sm">
                {item}
              </div>
            ))}
          </div>
        </Card>

        {state.status === "error" ? (
          <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <Card className="mobile-cta-safe flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            O projeto nasce público e pode ser detalhado na página de edição.
          </p>
          <Button type="submit" disabled={createPending} className="w-full sm:w-auto sm:min-w-48">
            {createPending ? "Criando..." : "Criar projeto agora"}
          </Button>
        </Card>
      </form>
    );
  }

  return (
    <>
    <form
      action={`/api/projects/${encodeURIComponent(car?.id ?? "")}/update`}
      method="post"
      onSubmit={handleEditSubmit}
      className="space-y-4 md:space-y-6"
    >
      <input type="hidden" name="car_id" value={car?.id ?? ""} />
      <input type="hidden" name="current_slug" value={car?.slug ?? ""} />
      <input type="hidden" name="catalog_version_id" value={realCatalogId(selectedCatalogVersion)} />
      <input type="hidden" name="factory_engine" value={car?.factory_engine ?? ""} />
      <input type="hidden" name="factory_induction" value={car?.factory_induction ?? ""} />
      <input type="hidden" name="factory_power_cv" value={car?.factory_power_cv ?? ""} />
      <input type="hidden" name="factory_transmission" value={car?.factory_transmission ?? ""} />
      <input type="hidden" name="factory_drivetrain" value={car?.factory_drivetrain ?? ""} />
      <input type="hidden" name="main_photo_url" value={mainPhotoUrl} />
      <input
        type="hidden"
        name="photo_urls_json"
        value={JSON.stringify(photoUrls.filter(Boolean))}
      />
      <input type="hidden" name="parts_json" value={serializedParts} />
      <input type="hidden" name="updates_json" value={serializedUpdates} />
      <input type="hidden" name="expenses_json" value={serializedExpenses} />

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-muted">Ficha publica do carro</p>
            <h1 className="mt-2 font-title text-2xl tracking-tight md:text-3xl">
              {mode === "edit" ? "Editar projeto" : "Adicionar meu projeto"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Nome, marca, modelo, ano, foto, objetivo e ficha essencial aparecem na página
              pública. Extras opcionais ficam abaixo e não impedem o projeto de chegar a 100%.
            </p>
          </div>
          {mode === "edit" ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs text-muted">
              {isEditProjectComplete ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <Gauge className="size-4 text-red-400" />
              )}
              {isEditProjectComplete
                ? "Projeto completo"
                : `Projeto ${editProjectProgressPercent}% completo`}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome do projeto">
              <Input
                name="name"
                defaultValue={car?.name ?? ""}
                placeholder="Gol G3 Turbo"
                required
              />
            </Field>
            {mode === "edit" ? (
          <Field label="Slug público">
                <Input name="slug" defaultValue={car?.slug ?? ""} required />
              </Field>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Field label="Marca">
              <select
                name="brand"
                value={brandInput}
                onChange={(event) => handleBrandChange(event.target.value)}
                className="pg-control h-12 rounded-3xl px-4 text-sm"
                required
              >
                <option value="" disabled>
                  Escolha uma marca
                </option>
                {editBrandOptions.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </Field>
            <ModelField
              brand={brandInput}
              value={modelInput}
              onChange={setModelInput}
              preservedValue={brandInput === car?.brand ? car?.model : null}
            />
            <Field label="Ano">
              <Input
                name="year"
                type="number"
                value={yearInput}
                onChange={(event) => setYearInput(event.target.value)}
                min={1900}
                max={2100}
                required
              />
            </Field>
            <Field label="Versão">
              {catalogMatches.length ? (
                <>
                  <select
                    value={versionSelectValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSelectedCatalogId(nextValue);
                      setEditVersionConfidence(
                        nextValue === UNKNOWN_VERSION_VALUE
                          ? "unknown"
                          : nextValue === OTHER_VERSION_VALUE
                            ? editVersionConfidence
                            : "confirmed"
                      );
                    }}
                    className="pg-control h-12 rounded-3xl px-4 text-sm"
                  >
                    <option value={UNKNOWN_VERSION_VALUE}>Nao sei</option>
                    {catalogMatches.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.version}
                        {version.generationName ? ` - ${version.generationName}` : ""}
                      </option>
                    ))}
                    <option value={OTHER_VERSION_VALUE}>Outro / manual</option>
                  </select>
                  {versionSelectValue === OTHER_VERSION_VALUE ? null : (
                    <input
                      type="hidden"
                      name="version"
                      value={selectedCatalogVersion?.version ?? ""}
                    />
                  )}
                  {versionSelectValue === OTHER_VERSION_VALUE ? (
                    <Input
                      name="version"
                      value={editManualVersion}
                      onChange={(event) => setEditManualVersion(event.target.value)}
                      placeholder="Digite a versao"
                    />
                  ) : null}
                </>
              ) : (
                <Input
                  name="version"
                  value={editManualVersion}
                  onChange={(event) => setEditManualVersion(event.target.value)}
                  placeholder="1.8 AP"
                />
              )}
            </Field>
            <Field label="Confiança da versão">
              <select
                name="version_confidence"
                value={editVersionConfidence}
                onChange={(event) => setEditVersionConfidence(event.target.value as DataConfidence)}
                className="pg-control h-12 rounded-3xl px-4 text-sm"
              >
                <option value="confirmed">Confirmada</option>
                <option value="estimated">Estimada</option>
                <option value="unknown">Não sei</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Estilo / categoria">
              <select
                name="category"
                defaultValue={car?.category ?? "Nacional"}
                className="pg-control h-12 rounded-3xl px-4 text-sm"
              >
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
              <Input
                name="state"
                defaultValue={car?.state ?? ""}
                placeholder="PR"
                maxLength={2}
              />
            </Field>
          </div>

          <Field label="Descrição curta">
            <textarea
              name="description"
              defaultValue={car?.description ?? ""}
              className="pg-control min-h-28 w-full resize-none rounded-3xl px-4 py-3 text-sm"
              placeholder="Conte o objetivo do projeto, uso principal e o que já foi feito."
            />
          </Field>

          <ProjectTagsField
            tags={tags}
            draft={tagDraft}
            onDraftChange={setTagDraft}
            onTagsChange={setTags}
          />

          <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
            <input
              type="checkbox"
              name="is_public"
              value="true"
              defaultChecked={car?.is_public ?? true}
              className="size-4 accent-red-500"
            />
            Página pública e indexável
          </label>

          <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
            <input
              type="checkbox"
              name="show_expenses_public"
              value="true"
              defaultChecked={car?.show_expenses_public ?? true}
              className="size-4 accent-red-500"
            />
            Mostrar custos públicos permitidos na página do projeto
          </label>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="font-title text-xl tracking-tight">Fotos</h2>
        <p className="mt-1 text-sm text-muted">
          Envie fotos reais para a capa e a galeria. A URL manual continua disponível como fallback.
        </p>
        <div className="mt-4">
          <ProjectImageUploader
            mainPhotoUrl={mainPhotoUrl}
            photoUrls={photoUrls}
            onMainPhotoChange={setMainPhotoUrl}
            onPhotoUrlsChange={setPhotoUrls}
          />
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="font-title text-xl tracking-tight">Especificacoes e objetivo</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label="Motor">
            <Input name="engine" defaultValue={car?.engine ?? ""} placeholder="AP 1.8 Turbo" />
          </Field>
          <Field label="Potência cv">
            <Input name="power_cv" type="number" defaultValue={car?.power_cv ?? ""} />
          </Field>
          <Field label="Torque Nm">
            <Input name="torque_nm" type="number" defaultValue={car?.torque_nm ?? ""} />
          </Field>
          <Field label="Peso kg">
            <Input name="weight_kg" type="number" defaultValue={car?.weight_kg ?? ""} />
          </Field>
          <Field label="Quilometragem">
            <Input name="mileage_km" type="number" defaultValue={car?.mileage_km ?? ""} />
          </Field>
          <Field label="Combustível">
            <Input
              name="fuel_type"
              defaultValue={car?.fuel_type ?? ""}
              placeholder="Flex, gasolina..."
            />
          </Field>
          <Field label="Câmbio">
            <Input name="transmission" defaultValue={car?.transmission ?? ""} />
          </Field>
          <Field label="Tração">
            <Input
              name="drivetrain"
              defaultValue={car?.drivetrain ?? ""}
              placeholder="Dianteira"
            />
          </Field>
          <Field label="Suspensão">
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
          <Field label="Status atual do projeto">
            <select
              name="project_status"
              defaultValue={car?.project_status ?? "Em andamento"}
              className="pg-control h-12 rounded-3xl px-4 text-sm"
            >
              {PROJECT_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data de inicio">
            <Input name="started_at" type="date" defaultValue={isoDate(car?.started_at)} />
          </Field>
          <Field label="Planejamento privado" className="md:col-span-2">
            <div className="rounded-3xl border border-border/70 bg-background/25 px-4 py-4 text-sm text-muted">
              A leitura de similaridade com uma build inspiração aparece somente na sua
              garagem privada. A página pública mostra estado atual, modificações, fotos,
              tags, última atualização e a mesma conclusão essencial da edição.
              A conclusão do projeto considera apenas ficha pública, foto, especificações
              essenciais e objetivo; extras como financeiro, timeline e modificações não bloqueiam 100%.
            </div>
            <input
              type="hidden"
              name="progress_percent"
              value={car?.progress_percent == null ? "" : String(car.progress_percent)}
            />
          </Field>
          <Field label="Meta do projeto" className="md:col-span-4">
            <Input
              name="project_goal"
              defaultValue={car?.project_goal ?? ""}
              placeholder="Projeto OEM+, 300cv aspirado, turbo de rua, track day..."
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-warning">Ficha técnica do dono</p>
            <h2 className="mt-1 font-title text-xl tracking-tight">
              {isEditProjectComplete ? "Projeto completo" : "Completar ficha essencial"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Esta parte conta para a porcentagem. Responda só o que você sabe; “Não sei”
              também é uma resposta válida e pode ser editada depois.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs text-muted">
            <Gauge className="size-4 text-red-400" />
            Detalhes {editSpecConfidencePercent}% respondidos
          </div>
        </div>

        <input
          type="hidden"
          name="factory_spec_confidence"
          value={car?.factory_spec_confidence ?? "estimated"}
        />
        <input
          type="hidden"
          name="spec_confidence_percent"
          value={String(editSpecConfidencePercent)}
        />

        <div className="mt-5 grid gap-5">
          <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
            <h3 className="font-title text-lg tracking-tight">Mecânica</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DetailAnswerGroup
                name="original_engine_answer"
                label="Motor original?"
                defaultValue={car?.original_engine_answer}
              />
              <DetailAnswerGroup
                name="original_induction_answer"
                label="Alimentação original?"
                defaultValue={car?.original_induction_answer}
              />
              <Field label="Alimentação atual">
                <select
                  name="current_induction"
                  defaultValue={car?.current_induction ?? ""}
                  className="pg-control h-12 rounded-3xl px-4 text-sm"
                >
                  <option value="">Não sei</option>
                  {INDUCTION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Observação dos dados de fábrica">
                <Input
                  name="factory_specs_note"
                  defaultValue={car?.factory_specs_note ?? ""}
                  placeholder="Ex: motor trocado antes da compra, versão a confirmar..."
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <h3 className="font-title text-lg tracking-tight">Visual</h3>
              <div className="mt-4 grid gap-4">
                <DetailAnswerGroup
                  name="original_color_answer"
                  label="Cor original?"
                  defaultValue={car?.original_color_answer}
                />
                <DetailAnswerGroup
                  name="original_wheels_answer"
                  label="Rodas originais?"
                  defaultValue={car?.original_wheels_answer}
                />
              </div>
            </div>

            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <h3 className="font-title text-lg tracking-tight">Interior</h3>
              <div className="mt-4">
                <DetailAnswerGroup
                  name="original_interior_answer"
                  label="Interior original?"
                  defaultValue={car?.original_interior_answer}
                />
              </div>
            </div>

            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <h3 className="font-title text-lg tracking-tight">Suspensão</h3>
              <div className="mt-4">
                <DetailAnswerGroup
                  name="original_suspension_answer"
                  label="Suspensão original?"
                  defaultValue={car?.original_suspension_answer}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs text-muted">Opcional - público quando preenchido</p>
            <h2 className="mt-1 font-title text-xl tracking-tight">Modificações atuais e planos futuros</h2>
            <p className="mt-1 text-sm text-muted">
              Separe modificações atuais dos planos futuros para enriquecer a ficha pública.
              Deixar vazio não reduz a conclusão do projeto.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:flex lg:flex-wrap lg:justify-end">
            {draftParts.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPartsExpanded((current) => !current)}
                className="w-full sm:col-span-2 lg:w-auto lg:col-span-1"
              >
                {partsExpanded ? "Ocultar" : `Ver ${draftParts.length} item(ns)`}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPart("installed")}
              className="w-full lg:w-auto"
            >
              <Plus className="size-4" />
              Adicionar modificação atual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addPart("planned")}
              className="w-full lg:w-auto"
            >
              <Plus className="size-4" />
              Adicionar plano futuro
            </Button>
          </div>
        </div>

        {draftParts.length && !partsExpanded ? (
          <p className="mt-4 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
            {draftParts.length} item(ns) salvo(s). Expanda para revisar ou editar.
          </p>
        ) : null}

        {partsExpanded ? (
        <div className="mt-5 grid gap-4">
          {draftParts.map((part) => (
            <div
              key={part.localId}
              className="rounded-4xl border border-border/70 bg-background/25 p-4"
            >
              <div className="grid gap-3 md:grid-cols-5">
                <Field label="Status">
                  <select
                    value={part.status}
                    onChange={(event) =>
                      updatePart(part.localId, {
                        status: event.target.value as CarPartStatus,
                      })
                    }
                    className="pg-control h-12 rounded-3xl px-4 text-sm"
                  >
                    <option value="installed">Instalada</option>
                    <option value="planned">Planejada</option>
                    <option value="removed">Removida</option>
                  </select>
                </Field>
                <Field label="Nome" className="md:col-span-2">
                  <Input
                    value={part.name}
                    onChange={(event) => updatePart(part.localId, { name: event.target.value })}
                    placeholder="Turbina .50"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    value={part.category}
                    onChange={(event) =>
                      updatePart(part.localId, { category: event.target.value })
                    }
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
                  <Input
                    value={part.brand}
                    onChange={(event) =>
                      updatePart(part.localId, { brand: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Field label="Preço estimado">
                  <Input
                    inputMode="numeric"
                    value={part.price_estimate}
                    onChange={(event) =>
                      updatePart(part.localId, { price_estimate: event.target.value })
                    }
                    placeholder="2500"
                  />
                </Field>
                <Field label="Data de instalação">
                  <Input
                    type="date"
                    value={part.installed_at}
                    onChange={(event) =>
                      updatePart(part.localId, { installed_at: event.target.value })
                    }
                  />
                </Field>
                <Field label="Prioridade">
                  <Input
                    value={part.priority}
                    onChange={(event) =>
                      updatePart(part.localId, { priority: event.target.value })
                    }
                    placeholder="alta, media..."
                  />
                </Field>
                <Field label="Loja">
                  <Input
                    value={part.store_name}
                    onChange={(event) =>
                      updatePart(part.localId, { store_name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Link externo">
                  <Input
                    value={part.external_url}
                    onChange={(event) =>
                      updatePart(part.localId, { external_url: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={part.image_url}
                  onChange={(event) =>
                    updatePart(part.localId, { image_url: event.target.value })
                  }
                  placeholder="Imagem da peça (URL ou upload da galeria)"
                />
                <Input
                  value={part.description}
                  onChange={(event) =>
                    updatePart(part.localId, { description: event.target.value })
                  }
                  placeholder="Observação rápida"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Remover peca"
                  onClick={() => removePart(part.localId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        ) : null}
      </Card>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-muted">Opcional - público quando preenchido</p>
            <h2 className="mt-1 font-title text-xl tracking-tight">Timeline de evolução</h2>
            <p className="mt-1 text-sm text-muted">
              Registre títulos, datas, fotos e valores por etapa. A timeline aparece na página
              pública, mas não é obrigatória para completar a ficha.
            </p>
          </div>
          {draftUpdates.length ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTimelineExpanded((current) => !current)}
            >
              {timelineExpanded ? "Ocultar" : `Ver ${draftUpdates.length} item(ns)`}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTimelineUpdate}
          >
            <Plus className="size-4" />
            Adicionar atualização
          </Button>
        </div>

        {draftUpdates.length && !timelineExpanded ? (
          <p className="mt-4 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
            {draftUpdates.length} item(ns) salvo(s). Expanda para revisar ou editar.
          </p>
        ) : null}

        {timelineExpanded ? (
        <div className="mt-5 grid gap-4">
          {draftUpdates.map((update) => (
            <div
              key={update.localId}
              className="rounded-4xl border border-border/70 bg-background/25 p-4"
            >
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Título" className="md:col-span-2">
                  <Input
                    value={update.title}
                    onChange={(event) =>
                      updateTimeline(update.localId, { title: event.target.value })
                    }
                    placeholder="Instalação de rodas Volcano"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    value={update.category}
                    onChange={(event) =>
                      updateTimeline(update.localId, { category: event.target.value })
                    }
                    className="pg-control h-12 rounded-3xl px-4 text-sm"
                  >
                    {UPDATE_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data">
                  <Input
                    type="date"
                    value={update.happened_at}
                    onChange={(event) =>
                      updateTimeline(update.localId, { happened_at: event.target.value })
                    }
                  />
                </Field>
                <Field label="Valor gasto">
                  <Input
                    inputMode="numeric"
                    value={update.amount_spent}
                    onChange={(event) =>
                      updateTimeline(update.localId, { amount_spent: event.target.value })
                    }
                    placeholder="2300"
                  />
                </Field>
                <div className="md:col-span-4">
                  <p className="mb-2 text-sm text-muted">Fotos da evolução</p>
                  <ProjectImageUploader
                    mainPhotoUrl={update.photo_url}
                    photoUrls={update.photo_urls.filter((url) => url !== update.photo_url)}
                    onMainPhotoChange={(url) =>
                      updateTimeline(update.localId, { photo_url: url })
                    }
                    onPhotoUrlsChange={(urls) =>
                      updateTimeline(update.localId, { photo_urls: urls })
                    }
                  />
                </div>
                <Field label="Descrição" className="md:col-span-4">
                  <textarea
                    value={update.description}
                    onChange={(event) =>
                      updateTimeline(update.localId, { description: event.target.value })
                    }
                    className="pg-control min-h-24 w-full resize-none rounded-3xl px-4 py-3 text-sm"
                    placeholder="Explique rapidamente o que mudou nesta etapa."
                  />
                </Field>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTimeline(update.localId)}
                >
                  <Trash2 className="size-4" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
        ) : null}
      </Card>

      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-muted">Opcional - valores privados por padrão</p>
            <h2 className="mt-1 font-title text-xl tracking-tight">Controle financeiro</h2>
            <p className="mt-1 text-sm text-muted">
              Use para acompanhar custos. Só os gastos marcados como públicos aparecem para visitantes;
              deixar vazio não reduz a conclusão do projeto.
            </p>
          </div>
          {draftExpenses.length ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpensesExpanded((current) => !current)}
            >
              {expensesExpanded ? "Ocultar" : `Ver ${draftExpenses.length} item(ns)`}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExpense}
          >
            <Plus className="size-4" />
            Adicionar gasto
          </Button>
        </div>

        {draftExpenses.length && !expensesExpanded ? (
          <p className="mt-4 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
            {draftExpenses.length} item(ns) salvo(s). Expanda para revisar ou editar.
          </p>
        ) : null}

        {expensesExpanded ? (
        <div className="mt-5 grid gap-4">
          {draftExpenses.map((expense) => (
            <div
              key={expense.localId}
              className="rounded-4xl border border-border/70 bg-background/25 p-4"
            >
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="Nome" className="md:col-span-2">
                  <Input
                    value={expense.name}
                    onChange={(event) =>
                      updateExpense(expense.localId, { name: event.target.value })
                    }
                    placeholder="Jogo de pastilhas"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    value={expense.category}
                    onChange={(event) =>
                      updateExpense(expense.localId, { category: event.target.value })
                    }
                    className="pg-control h-12 rounded-3xl px-4 text-sm"
                  >
                    {PROJECT_EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Valor">
                  <Input
                    inputMode="numeric"
                    value={expense.amount}
                    onChange={(event) =>
                      updateExpense(expense.localId, { amount: event.target.value })
                    }
                    placeholder="1100"
                  />
                </Field>
                <Field label="Data">
                  <Input
                    type="date"
                    value={expense.spent_at}
                    onChange={(event) =>
                      updateExpense(expense.localId, { spent_at: event.target.value })
                    }
                  />
                </Field>
                <Field label="Modificação relacionada" className="md:col-span-2">
                  <Input
                    value={expense.part_name}
                    onChange={(event) =>
                      updateExpense(expense.localId, { part_name: event.target.value })
                    }
                    placeholder="Ex: turbina, rodas, coilover..."
                  />
                </Field>
                <Field label="Observação" className="md:col-span-2">
                  <Input
                    value={expense.note}
                    onChange={(event) =>
                      updateExpense(expense.localId, { note: event.target.value })
                    }
                    placeholder="Compra, mão de obra, revisão..."
                  />
                </Field>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-3 rounded-3xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={expense.is_public}
                    onChange={(event) =>
                      updateExpense(expense.localId, { is_public: event.target.checked })
                    }
                    className="size-4 accent-red-500"
                  />
                  Mostrar este gasto na página pública
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeExpense(expense.localId)}
                >
                  <Trash2 className="size-4" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
        ) : null}
      </Card>

      {state.status === "error" ? (
        <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-[calc(88px+env(safe-area-inset-bottom))] z-20 md:static">
        {mode === "edit" && deleteState.status === "error" ? (
          <p className="rounded-3xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {deleteState.message}
          </p>
        ) : null}

        <Card className="mobile-cta-safe space-y-3 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {mode === "edit"
                ? isEditProjectComplete
                  ? "Projeto completo. Salve mudanças quando editar algo ou abra a página publicada."
                  : "Salve para atualizar a ficha pública e a descoberta."
                : "Ao salvar, o projeto já nasce com a ficha pública e pode receber extras depois."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {mode === "edit" && editProjectHref ? (
                <Button asChild variant="outline">
                  <Link href={editProjectHref}>
                    <Eye className="size-4" />
                    Ver projeto publicado
                  </Link>
                </Button>
              ) : null}
              <Button type="submit" disabled={editPending || deletePending} className="w-full sm:w-auto sm:min-w-48">
                {editPending
                  ? "Salvando..."
                  : mode === "edit"
                    ? "Salvar alterações"
                    : "Criar página do projeto"}
              </Button>
            </div>
          </div>

          {mode === "edit" ? (
            <div className="flex flex-col gap-3 rounded-3xl border border-danger/30 bg-danger/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Zona de perigo: excluir remove o projeto definitivamente.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={editPending || deletePending}
                className="border-danger/40 text-danger hover:bg-danger/10 sm:w-auto"
                onClick={(event) => {
                  if (!window.confirm("Excluir este projeto definitivamente?")) {
                    event.preventDefault();
                    return;
                  }

                  deleteFormRef.current?.requestSubmit();
                }}
              >
                <Trash2 className="size-4" />
                {deletePending ? "Excluindo..." : "Excluir projeto"}
              </Button>
            </div>
          ) : null}
      </Card>
      </div>
    </form>
    {mode === "edit" ? (
      <form ref={deleteFormRef} action={deleteFormAction} className="hidden">
        <input type="hidden" name="car_id" value={car?.id ?? ""} />
      </form>
    ) : null}
    </>
  );
}
