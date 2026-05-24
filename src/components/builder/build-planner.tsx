"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  DollarSign,
  Eye,
  Flame,
  Gauge,
  Layers3,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PremiumCard } from "@/components/ui/premium-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL, formatBRLCompact } from "@/lib/pricing";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useSupabaseUser } from "@/lib/supabase/use-user";
import { cn } from "@/lib/utils";

type CarLite = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  year_start: number;
  year_end: number | null;
  power_cv: number | null;
  torque_nm: number | null;
  weight_kg: number | null;
  category: string | null;
  fuel_type: string | null;
};

type PartLite = {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  price_min: number | null;
  price_max: number | null;
  compatible_cars: string[];
  affiliate_url: string | null;
  affiliate_store: string | null;
  image_url: string | null;
  notes: string | null;
};

type StyleId =
  | "jdm"
  | "sleeper"
  | "corrida"
  | "rebaixado"
  | "som"
  | "drift"
  | "rally"
  | "oemplus"
  | "luxo"
  | "turbostreet";

type CompatibilityBadge = "compatível" | "verificar" | "incompatível";

const BUDGET_MIN = 2000;
const BUDGET_MAX = 100000;
const BUDGET_STEP = 500;

const styles: Array<{
  id: StyleId;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "jdm",
    label: "JDM",
    description: "Equilíbrio, estilo e detalhes japoneses.",
    icon: <Sparkles className="size-5 text-accent" />,
  },
  {
    id: "sleeper",
    label: "Sleeper",
    description: "Discreto por fora, forte por dentro.",
    icon: <Shield className="size-5 text-accent" />,
  },
  {
    id: "corrida",
    label: "Corrida",
    description: "Foco em tempo de volta e consistência.",
    icon: <Gauge className="size-5 text-accent" />,
  },
  {
    id: "rebaixado",
    label: "Rebaixado",
    description: "Fitment, presença e postura no asfalto.",
    icon: <CarFront className="size-5 text-accent" />,
  },
  {
    id: "som",
    label: "Som",
    description: "Qualidade e pressão com set completo.",
    icon: <Layers3 className="size-5 text-accent" />,
  },
  {
    id: "drift",
    label: "Drift",
    description: "Controle, ângulo e resfriamento.",
    icon: <Wrench className="size-5 text-accent" />,
  },
  {
    id: "rally",
    label: "Rally",
    description: "Robustez, suspensão e tração.",
    icon: <Wrench className="size-5 text-accent" />,
  },
  {
    id: "oemplus",
    label: "OEM+",
    description: "Upgrade fino sem perder originalidade.",
    icon: <Check className="size-5 text-accent" />,
  },
  {
    id: "luxo",
    label: "Luxo",
    description: "Conforto, interior e presença premium.",
    icon: <Shield className="size-5 text-accent" />,
  },
  {
    id: "turbostreet",
    label: "Turbo Street",
    description: "Turbo com usabilidade no dia a dia.",
    icon: <Flame className="size-5 text-accent" />,
  },
];

function normalizeKey(value: string) {
  try {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function slugify(input: string) {
  const base = normalizeKey(input)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base.slice(0, 60) || "build";
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

function carImageForSlug(slug: string) {
  const key = normalizeKey(slug);
  if (key.includes("golf") || key.includes("wrx")) return "/ref/car-white.jpg";
  if (key.includes("gol") || key.includes("onix")) return "/ref/car-black.jpg";
  return "/ref/hero-car.jpg";
}

function categoryLabel(category: string | null) {
  if (!category) return "carro";
  const c = normalizeKey(category);
  if (c === "hatch") return "Hatch";
  if (c === "sedan") return "Sedan";
  if (c === "esportivo") return "Esportivo";
  if (c === "wagon" || c === "perua") return "Perua";
  return category;
}

function partPriceLabel(part: PartLite) {
  const min = part.price_min ?? null;
  const max = part.price_max ?? null;
  if (min === null && max === null) return "Preço a definir";
  if (min !== null && max === null) return `A partir de ${formatBRLCompact(min)}`;
  if (min === null && max !== null) return `Até ${formatBRLCompact(max)}`;
  return `${formatBRLCompact(min!)}–${formatBRLCompact(max!)}`;
}

function isProbablyUniversal(partCategory: string) {
  const c = normalizeKey(partCategory);
  return (
    c.includes("estet") ||
    c.includes("body") ||
    c.includes("intern") ||
    c.includes("som") ||
    c.includes("audio") ||
    c.includes("ilumin")
  );
}

function compatibilityForPart(part: PartLite, carSlug: string | null): CompatibilityBadge {
  if (!carSlug) return "verificar";
  if (part.compatible_cars.includes(carSlug)) return "compatível";
  if (part.compatible_cars.length === 0) return "verificar";
  if (isProbablyUniversal(part.category)) return "verificar";
  return "incompatível";
}

function scoreFromSelectedParts(parts: PartLite[], carSlug: string | null) {
  if (parts.length === 0) return 0;
  let total = 0;
  for (const p of parts) {
    const badge = compatibilityForPart(p, carSlug);
    if (badge === "compatível") total += 1;
    else if (badge === "verificar") total += 0.5;
    else total += 0;
  }
  return Math.round((total / parts.length) * 100);
}

function totalBudget(parts: PartLite[]) {
  return parts.reduce(
    (acc, p) => ({
      min: acc.min + (p.price_min ?? 0),
      max: acc.max + (p.price_max ?? p.price_min ?? 0),
      missing: acc.missing + (p.price_min == null && p.price_max == null ? 1 : 0),
    }),
    { min: 0, max: 0, missing: 0 }
  );
}

export function BuildPlanner({
  initialCars,
  initialParts,
}: {
  initialCars: CarLite[];
  initialParts: PartLite[];
}) {
  const { user, loading: userLoading, configured } = useSupabaseUser();
  const supabase = getSupabaseBrowserClient();

  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  const [carQuery, setCarQuery] = React.useState("");
  const [brandFilter, setBrandFilter] = React.useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [selectedCarId, setSelectedCarId] = React.useState<string | null>(null);

  const [budgetMin, setBudgetMin] = React.useState(BUDGET_MIN);
  const [budgetMax, setBudgetMax] = React.useState(15000);
  const [styleId, setStyleId] = React.useState<StyleId | null>(null);

  const [partQuery, setPartQuery] = React.useState("");
  const [showAllParts, setShowAllParts] = React.useState(false);
  const [selectedPartIds, setSelectedPartIds] = React.useState<string[]>([]);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);

  const [saveBusy, setSaveBusy] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccessUrl, setSaveSuccessUrl] = React.useState<string | null>(null);

  const selectedCar = React.useMemo(
    () => initialCars.find((c) => c.id === selectedCarId) ?? null,
    [initialCars, selectedCarId]
  );

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartLite>();
    for (const p of initialParts) map.set(p.id, p);
    return map;
  }, [initialParts]);

  const selectedParts = React.useMemo(
    () => selectedPartIds.map((id) => partsById.get(id)).filter(Boolean) as PartLite[],
    [partsById, selectedPartIds]
  );

  const brands = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of initialCars) set.add(c.brand);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [initialCars]);

  const carCategories = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of initialCars) if (c.category) set.add(c.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [initialCars]);

  const filteredCars = React.useMemo(() => {
    const q = normalizeKey(carQuery);
    return initialCars.filter((c) => {
      if (brandFilter && c.brand !== brandFilter) return false;
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = normalizeKey(`${c.name} ${c.brand} ${c.model}`);
      return hay.includes(q);
    });
  }, [brandFilter, carQuery, categoryFilter, initialCars]);

  const filteredParts = React.useMemo(() => {
    const q = normalizeKey(partQuery);
    const carSlug = selectedCar?.slug ?? null;
    return initialParts
      .filter((p) => {
        if (!showAllParts) {
          const badge = compatibilityForPart(p, carSlug);
          if (badge === "incompatível") return false;
        }

      if (!q) return true;
      const hay = normalizeKey(`${p.name} ${p.brand ?? ""} ${p.category} ${p.subcategory ?? ""}`);
      if (!hay.includes(q)) return false;
      return true;
    })
      .sort((a, b) => {
        const aCompat = compatibilityForPart(a, carSlug) === "compatível" ? 0 : 1;
        const bCompat = compatibilityForPart(b, carSlug) === "compatível" ? 0 : 1;
        return (
          aCompat - bCompat ||
          a.category.localeCompare(b.category, "pt-BR") ||
          a.name.localeCompare(b.name, "pt-BR")
        );
      });
  }, [initialParts, partQuery, selectedCar?.slug, showAllParts]);

  const partsByCategory = React.useMemo(() => {
    const map = new Map<string, PartLite[]>();
    for (const p of filteredParts) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filteredParts]);

  const compatibilityScore = React.useMemo(
    () => scoreFromSelectedParts(selectedParts, selectedCar?.slug ?? null),
    [selectedParts, selectedCar?.slug]
  );

  const budget = React.useMemo(() => totalBudget(selectedParts), [selectedParts]);

  const incompatibles = React.useMemo(() => {
    const carSlug = selectedCar?.slug ?? null;
    return selectedParts.filter((p) => compatibilityForPart(p, carSlug) === "incompatível");
  }, [selectedCar?.slug, selectedParts]);

  const canGoStep2 = Boolean(selectedCar);
  const canGoStep3 = canGoStep2 && Boolean(styleId) && budgetMax >= budgetMin;
  const canGoStep4 = canGoStep3;

  function goNext() {
    setStep((s) => {
      if (s === 1) return canGoStep2 ? 2 : 1;
      if (s === 2) return canGoStep3 ? 3 : 2;
      if (s === 3) return canGoStep4 ? 4 : 3;
      return 4;
    });
  }

  function goBack() {
    setStep((s) => (s === 4 ? 3 : s === 3 ? 2 : s === 2 ? 1 : 1));
  }

  async function uploadPhotoIfNeeded(buildSlug: string) {
    if (!supabase || !photoFile || !user) return null;

    const bucket = "build-photos";
    const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${buildSlug}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, photoFile, { upsert: false, contentType: photoFile.type || undefined });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl || null;
  }

  async function saveBuild() {
    setSaveError(null);
    setSaveSuccessUrl(null);

    if (!supabase || !configured) {
      setSaveError("Configure o Supabase para salvar builds.");
      return;
    }
    if (userLoading) return;
    if (!user) {
      setSaveError("Faça login para salvar sua build.");
      return;
    }
    if (!selectedCar) {
      setSaveError("Escolha um carro para continuar.");
      return;
    }
    if (!styleId) {
      setSaveError("Escolha um estilo para continuar.");
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError("Dê um título para sua build.");
      return;
    }

    setSaveBusy(true);

    try {
      const baseSlug = slugify(trimmedTitle);
      let finalSlug = baseSlug;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: exists } = await supabase
          .from("builds")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (!exists) break;
        finalSlug = `${baseSlug}-${randomSuffix()}`;
      }

      const carPhotoUrl = await uploadPhotoIfNeeded(finalSlug);

      const payload = {
        slug: finalSlug,
        title: trimmedTitle,
        user_id: user.id,
        car_id: selectedCar.id,
        style: styleId,
        budget_min: budgetMin,
        budget_max: budgetMax,
        compatibility_score: compatibilityScore,
        parts: selectedPartIds,
        description: description.trim() ? description.trim() : null,
        car_photo_url: carPhotoUrl,
        is_public: isPublic,
      };

      const { error } = await supabase.from("builds").insert(payload);
      if (error) throw error;

      const url = `/builds/${finalSlug}`;
      setSaveSuccessUrl(url);
      setStep(4);
    } catch (e) {
      const message =
        e && typeof e === "object" && "message" in e && typeof e.message === "string"
          ? e.message
          : "Erro ao salvar build.";
      setSaveError(message);
    } finally {
      setSaveBusy(false);
    }
  }

  const stepper = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {[
          { n: 1, label: "Carro", ok: Boolean(selectedCar) },
          { n: 2, label: "Orçamento", ok: Boolean(selectedCar) && Boolean(styleId) },
          { n: 3, label: "Peças", ok: Boolean(selectedCar) && Boolean(styleId) },
          { n: 4, label: "Resumo", ok: Boolean(selectedCar) && Boolean(styleId) },
        ].map((s) => {
          const active = step === s.n;
          const clickable =
            (s.n === 1) ||
            (s.n === 2 && canGoStep2) ||
            (s.n === 3 && canGoStep3) ||
            (s.n === 4 && canGoStep4);

          return (
            <button
              key={s.n}
              type="button"
              onClick={() => clickable && setStep(s.n as 1 | 2 | 3 | 4)}
              className={cn(
                "flex-1 rounded-4xl border px-4 py-3 text-left transition active:scale-[0.99]",
                active
                  ? "border-accent/35 bg-accent/10 shadow-glow"
                  : "border-border/70 bg-background/25 hover:bg-background/35",
                !clickable && "opacity-60 cursor-not-allowed hover:bg-background/25"
              )}
              disabled={!clickable}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    Etapa {s.n}
                  </p>
                  <p className="mt-1 font-ui font-semibold tracking-tight truncate">
                    {s.label}
                  </p>
                </div>
                {s.ok ? (
                  <CircleCheck className="size-5 text-accent" />
                ) : (
                  <CircleHelp className="size-5 text-muted" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1}
          onClick={goBack}
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
        <Button
          type="button"
          disabled={step === 4}
          onClick={goNext}
        >
          Próximo
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );

  if (!isSupabaseConfigured) {
    return (
      <Card className="p-6 md:p-8">
        <p className="text-xs text-muted">Montar build</p>
        <h1 className="mt-2 font-title text-2xl tracking-tight">
          Configure o Supabase primeiro
        </h1>
        <p className="mt-2 text-sm text-muted">
          Para listar carros e peças reais, configure <span className="text-foreground font-semibold">.env.local</span> com{" "}
          <span className="text-foreground font-semibold">NEXT_PUBLIC_SUPABASE_URL</span> e{" "}
          <span className="text-foreground font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
        </p>
      </Card>
    );
  }

  if (!initialCars.length || !initialParts.length) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-4xl" />
        <Skeleton className="h-72 rounded-4xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PremiumCard className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/ref/hero-car.jpg"
            alt=""
            fill
            priority
            className="object-cover object-right opacity-35 blur-[2px] scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/40 to-black/30" />
          <div className="absolute inset-0 pointer-events-none pg-scanlines opacity-16" />
          <div className="absolute inset-0 pointer-events-none pg-particles opacity-40" />
        </div>

        <div className="relative p-6 md:p-8">
          <p className="text-xs text-muted">Planejador</p>
          <h1 className="mt-2 font-title text-3xl md:text-4xl tracking-tight">
            Monte sua build do jeito certo
          </h1>
          <p className="mt-2 text-muted max-w-2xl">
            Escolha carro, orçamento e estilo, selecione peças reais e publique sua build com score de compatibilidade.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <p className="text-xs text-muted">Score</p>
              <p className="mt-2 font-title tracking-tight tabular-nums">
                {compatibilityScore}%
              </p>
              <p className="mt-1 text-xs text-muted">
                {selectedParts.length} peça(s) selecionada(s)
              </p>
            </div>
            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <p className="text-xs text-muted">Orçamento (peças)</p>
              <p className="mt-2 font-title tracking-tight tabular-nums">
                {formatBRLCompact(Math.round((budget.min + budget.max) / 2))}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatBRLCompact(budget.min)}–{formatBRLCompact(budget.max)}
                {budget.missing ? ` • ${budget.missing} sem preço` : ""}
              </p>
            </div>
            <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
              <p className="text-xs text-muted">Publicação</p>
              <p className="mt-2 font-title tracking-tight">
                {user ? "Pronto para salvar" : "Sem login"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {user ? "Builds públicas aparecem no feed." : "Você pode montar, mas só salva logado."}
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      {stepper}

      {step === 1 ? (
        <Card className="p-6 md:p-8">
          <p className="text-xs text-muted">Etapa 1</p>
          <h2 className="mt-2 font-title text-2xl tracking-tight">Escolha o carro</h2>
          <p className="mt-2 text-sm text-muted">
            Busque por nome/modelo e filtre por marca e categoria.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Input
                value={carQuery}
                onChange={(e) => setCarQuery(e.target.value)}
                placeholder="Buscar: Civic, Golf, HB20…"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCarQuery("");
                setBrandFilter(null);
                setCategoryFilter(null);
              }}
            >
              Limpar filtros
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-4xl border border-border/70 bg-background/20 p-4">
              <p className="text-xs text-muted">Marca</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={brandFilter ? "outline" : "default"}
                  onClick={() => setBrandFilter(null)}
                >
                  Todas
                </Button>
                {brands.map((b) => (
                  <Button
                    key={b}
                    type="button"
                    size="sm"
                    variant={brandFilter === b ? "default" : "outline"}
                    onClick={() => setBrandFilter(b)}
                  >
                    {b}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-4xl border border-border/70 bg-background/20 p-4">
              <p className="text-xs text-muted">Categoria</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={categoryFilter ? "outline" : "default"}
                  onClick={() => setCategoryFilter(null)}
                >
                  Todas
                </Button>
                {carCategories.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    size="sm"
                    variant={categoryFilter === c ? "default" : "outline"}
                    onClick={() => setCategoryFilter(c)}
                  >
                    {categoryLabel(c)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCars.map((car) => {
              const selected = car.id === selectedCarId;
              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => setSelectedCarId(car.id)}
                  className={cn(
                    "text-left rounded-4xl border overflow-hidden transition active:scale-[0.99]",
                    selected
                      ? "border-accent/35 bg-accent/10 shadow-glow"
                      : "border-border/70 bg-background/25 hover:bg-background/35"
                  )}
                >
                  <div className="relative h-28">
                    <Image
                      src={carImageForSlug(car.slug)}
                      alt=""
                      fill
                      className="object-cover opacity-75"
                      sizes="(max-width: 768px) 90vw, 300px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                      <Badge variant="secondary">{categoryLabel(car.category)}</Badge>
                      {selected ? <Badge variant="success">Selecionado</Badge> : null}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted">{car.brand}</p>
                    <p className="mt-1 font-ui font-semibold tracking-tight">
                      {car.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {car.year_start}
                      {car.year_end ? `–${car.year_end}` : "+"}
                      {car.fuel_type ? ` • ${car.fuel_type}` : ""}
                    </p>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2">
                        <p className="text-muted">cv</p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {car.power_cv ?? "—"}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2">
                        <p className="text-muted">nm</p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {car.torque_nm ?? "—"}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border/70 bg-background/25 px-3 py-2">
                        <p className="text-muted">kg</p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {car.weight_kg ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="p-6 md:p-8">
          <p className="text-xs text-muted">Etapa 2</p>
          <h2 className="mt-2 font-title text-2xl tracking-tight">
            Orçamento e estilo
          </h2>
          <p className="mt-2 text-sm text-muted">
            Defina sua faixa de orçamento e escolha o estilo da build.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">Orçamento</p>
                  <p className="mt-1 font-title tracking-tight">
                    {formatBRL(budgetMin)}–{budgetMax >= BUDGET_MAX ? "R$ 100k+" : formatBRL(budgetMax)}
                  </p>
                </div>
                <Badge variant="secondary">
                  <DollarSign className="size-3.5" /> faixa
                </Badge>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted">Mínimo</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={budgetMin}
                      min={BUDGET_MIN}
                      max={budgetMax}
                      step={BUDGET_STEP}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value || BUDGET_MIN), BUDGET_MIN, BUDGET_MAX);
                        setBudgetMin(Math.min(v, budgetMax));
                      }}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted">Máximo</p>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={budgetMax}
                      min={budgetMin}
                      max={BUDGET_MAX}
                      step={BUDGET_STEP}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value || budgetMin), BUDGET_MIN, BUDGET_MAX);
                        setBudgetMax(Math.max(v, budgetMin));
                      }}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted">Ajuste rápido</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[5000, 10000, 20000, 40000, 80000, 100000].map((v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBudgetMin(BUDGET_MIN);
                          setBudgetMax(v);
                        }}
                      >
                        {v >= 100000 ? "R$ 100k+" : formatBRLCompact(v)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                  <p className="text-xs text-muted">Slider</p>
                  <div className="mt-3 grid gap-3">
                    <input
                      type="range"
                      min={BUDGET_MIN}
                      max={BUDGET_MAX}
                      step={BUDGET_STEP}
                      value={budgetMin}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setBudgetMin(Math.min(v, budgetMax));
                      }}
                      className="w-full accent-accent"
                      aria-label="Orçamento mínimo"
                    />
                    <input
                      type="range"
                      min={BUDGET_MIN}
                      max={BUDGET_MAX}
                      step={BUDGET_STEP}
                      value={budgetMax}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setBudgetMax(Math.max(v, budgetMin));
                      }}
                      className="w-full accent-accent"
                      aria-label="Orçamento máximo"
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Dica: mova o mínimo e depois o máximo para criar uma faixa.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
              <p className="text-xs text-muted">Estilo</p>
              <p className="mt-1 text-sm text-muted">
                O estilo aparece no card da build e no SEO.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {styles.map((s) => {
                  const active = s.id === styleId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={cn(
                        "text-left rounded-4xl border p-4 transition active:scale-[0.99]",
                        active
                          ? "border-accent/35 bg-accent/10 shadow-glow"
                          : "border-border/70 bg-background/25 hover:bg-background/35"
                      )}
                      onClick={() => setStyleId(s.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{s.icon}</div>
                        <div className="min-w-0">
                          <p className="font-ui font-semibold tracking-tight">
                            {s.label}
                          </p>
                          <p className="mt-1 text-xs text-muted">{s.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="p-6 md:p-8">
          <p className="text-xs text-muted">Etapa 3</p>
          <h2 className="mt-2 font-title text-2xl tracking-tight">
            Seleção de peças
          </h2>
          <p className="mt-2 text-sm text-muted">
            Peças são organizadas por categoria. O badge mostra compatibilidade com{" "}
            <span className="text-foreground font-semibold">
              {selectedCar?.name ?? "o carro"}
            </span>
            .
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={partQuery}
                  onChange={(e) => setPartQuery(e.target.value)}
                  placeholder="Buscar peças: coilover, K&N, Brembo…"
                />
                <Button type="button" variant="outline" onClick={() => setPartQuery("")}>
                  Limpar
                </Button>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-muted">
                  {showAllParts ? "Mostrando todas as peças (inclui incompatíveis)." : "Mostrando compatíveis + universais (recomendado)."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={showAllParts ? "default" : "outline"}
                  onClick={() => setShowAllParts((v) => !v)}
                >
                  {showAllParts ? "Ocultar incompatíveis" : "Mostrar tudo"}
                </Button>
              </div>

              <div className="mt-5 space-y-6">
                {partsByCategory.map(([category, parts]) => (
                  <section key={category} className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted">Categoria</p>
                        <h3 className="mt-1 font-title tracking-tight truncate">
                          {category}
                        </h3>
                      </div>
                      <Badge variant="secondary">{parts.length}</Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {parts.map((part) => {
                        const selected = selectedPartIds.includes(part.id);
                        const badge = compatibilityForPart(part, selectedCar?.slug ?? null);
                        const badgeVariant =
                          badge === "compatível"
                            ? "success"
                            : badge === "verificar"
                              ? "warning"
                              : "danger";

                        return (
                          <div
                            key={part.id}
                            className={cn(
                              "rounded-4xl border p-4 transition",
                              selected
                                ? "border-accent/35 bg-accent/10 shadow-glow"
                                : "border-border/70 bg-background/25 hover:bg-background/35"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-muted">
                                  {part.brand ?? "Marca"}
                                </p>
                                <p className="mt-1 font-ui font-semibold tracking-tight truncate">
                                  {part.name}
                                </p>
                                <p className="mt-1 text-xs text-muted truncate">
                                  {part.subcategory ?? part.category} • {partPriceLabel(part)}
                                </p>
                              </div>
                              <Badge variant={badgeVariant}>{badge === "compatível" ? "✅ Compatível" : badge === "verificar" ? "⚠️ Verificar" : "❌ Incompatível"}</Badge>
                            </div>

                            {part.notes ? (
                              <p className="mt-3 text-xs text-muted">
                                {part.notes}
                              </p>
                            ) : null}

                            <div className="mt-4 flex flex-col sm:flex-row gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={selected ? "secondary" : "default"}
                                onClick={() => {
                                  setSelectedPartIds((prev) =>
                                    selected
                                      ? prev.filter((id) => id !== part.id)
                                      : [...prev, part.id]
                                  );
                                }}
                              >
                                {selected ? (
                                  <>
                                    <Trash2 className="size-4" />
                                    Remover
                                  </>
                                ) : (
                                  <>
                                    <Plus className="size-4" />
                                    Adicionar
                                  </>
                                )}
                              </Button>

                              {part.affiliate_url ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  asChild
                                >
                                  <a
                                    href={part.affiliate_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Comprar
                                  </a>
                                </Button>
                              ) : (
                                <Button type="button" size="sm" variant="outline" disabled>
                                  Em breve
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <PremiumCard className="p-5">
                <p className="text-xs text-muted">Resumo da seleção</p>
                <h3 className="mt-2 font-title tracking-tight">Compatibilidade</h3>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted">Score</p>
                      <Badge variant={compatibilityScore >= 85 ? "success" : compatibilityScore >= 60 ? "warning" : "danger"}>
                        {compatibilityScore}%
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-background/60 overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${compatibilityScore}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Baseado na lista de compatibilidade de cada peça.
                    </p>
                  </div>

                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-sm text-muted">Orçamento estimado (peças)</p>
                    <p className="mt-2 font-title tracking-tight tabular-nums">
                      {formatBRLCompact(Math.round((budget.min + budget.max) / 2))}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatBRLCompact(budget.min)}–{formatBRLCompact(budget.max)}
                      {budget.missing ? ` • ${budget.missing} sem preço` : ""}
                    </p>
                  </div>

                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-sm text-muted">Selecionadas</p>
                    <p className="mt-2 font-title tracking-tight tabular-nums">
                      {selectedParts.length}
                    </p>
                    {selectedParts.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedParts.slice(0, 6).map((p) => (
                          <Badge key={p.id} variant="secondary">
                            {p.brand ? `${p.brand} ` : ""}
                            {p.name}
                          </Badge>
                        ))}
                        {selectedParts.length > 6 ? (
                          <Badge variant="secondary">
                            +{selectedParts.length - 6}
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted">
                        Adicione peças para ver o score evoluir.
                      </p>
                    )}
                  </div>

                  {incompatibles.length ? (
                    <div className="rounded-4xl border border-danger/30 bg-danger/10 p-4">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="mt-0.5 size-5 text-danger" />
                        <div className="min-w-0">
                          <p className="text-sm font-ui font-semibold tracking-tight">
                            Atenção: incompatibilidades
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Estas peças não listam compatibilidade com{" "}
                            <span className="text-foreground font-semibold">
                              {selectedCar?.name ?? "o carro"}
                            </span>
                            .
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {incompatibles.slice(0, 6).map((p) => (
                              <Badge key={p.id} variant="danger">
                                {p.name}
                              </Badge>
                            ))}
                            {incompatibles.length > 6 ? (
                              <Badge variant="danger">
                                +{incompatibles.length - 6}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </PremiumCard>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="p-6 md:p-8">
          <p className="text-xs text-muted">Etapa 4</p>
          <h2 className="mt-2 font-title text-2xl tracking-tight">
            Resumo e publicação
          </h2>
          <p className="mt-2 text-sm text-muted">
            Dê um título, envie a foto e salve sua build no banco.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-4">
              <div>
                <p className="text-xs text-muted">Título</p>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Civic G8 OEM+ Daily"
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-xs text-muted">Descrição (opcional)</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo da build, prioridade de peças, observações…"
                  className="mt-2 pg-control min-h-[120px] w-full resize-none rounded-3xl px-4 py-3 text-sm placeholder:text-muted outline-none"
                />
              </div>

              <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Foto do carro</p>
                    <p className="mt-1 text-sm text-muted">
                      Upload real via Supabase Storage (bucket <span className="text-foreground font-semibold">build-photos</span>).
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Camera className="size-3.5" /> upload
                  </Badge>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPhotoFile(null)}
                    disabled={!photoFile}
                  >
                    Remover
                  </Button>
                </div>
                {photoFile ? (
                  <p className="mt-2 text-xs text-muted">
                    Selecionada: <span className="text-foreground font-semibold">{photoFile.name}</span>
                  </p>
                ) : null}
              </div>

              <div className="rounded-4xl border border-border/70 bg-background/20 p-5">
                <p className="text-xs text-muted">Visibilidade</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant={isPublic ? "default" : "outline"}
                    onClick={() => setIsPublic(true)}
                  >
                    <Eye className="size-4" />
                    Pública
                  </Button>
                  <Button
                    type="button"
                    variant={!isPublic ? "default" : "outline"}
                    onClick={() => setIsPublic(false)}
                  >
                    Privada
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Builds públicas aparecem na comunidade e têm URL indexável.
                </p>
              </div>

              {saveError ? (
                <div className="rounded-4xl border border-danger/30 bg-danger/10 p-4">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 size-5 text-danger" />
                    <p className="text-sm text-muted">{saveError}</p>
                  </div>
                </div>
              ) : null}

              {saveSuccessUrl ? (
                <div className="rounded-4xl border border-success/30 bg-success/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-ui font-semibold tracking-tight">
                        Build salva
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Acesse sua página pública para compartilhar.
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={saveSuccessUrl}>Ver build</Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2">
                {user ? (
                  <Button
                    type="button"
                    className="sm:flex-1"
                    disabled={saveBusy}
                    onClick={saveBuild}
                  >
                    {saveBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Salvando…
                      </>
                    ) : (
                      "Salvar build"
                    )}
                  </Button>
                ) : (
                  <Button asChild className="sm:flex-1">
                    <Link href={`/login?next=${encodeURIComponent("/montar")}`}>
                      Fazer login para salvar
                    </Link>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="sm:flex-1"
                  onClick={() => {
                    setStep(1);
                    setSaveError(null);
                    setSaveSuccessUrl(null);
                  }}
                  disabled={saveBusy}
                >
                  Montar outra
                </Button>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24">
              <PremiumCard className="p-5">
                <p className="text-xs text-muted">Resumo</p>
                <h3 className="mt-2 font-title tracking-tight">Sua build</h3>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Carro</p>
                    <p className="mt-1 font-ui font-semibold tracking-tight">
                      {selectedCar?.name ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {selectedCar?.brand ?? "—"} • {categoryLabel(selectedCar?.category ?? null)}
                    </p>
                  </div>
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Estilo</p>
                    <p className="mt-1 font-ui font-semibold tracking-tight">
                      {styles.find((s) => s.id === styleId)?.label ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatBRL(budgetMin)}–{budgetMax >= BUDGET_MAX ? "R$ 100k+" : formatBRL(budgetMax)}
                    </p>
                  </div>
                  <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                    <p className="text-xs text-muted">Compatibilidade</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="font-title tracking-tight tabular-nums">
                        {compatibilityScore}%
                      </p>
                      <Badge variant={compatibilityScore >= 85 ? "success" : compatibilityScore >= 60 ? "warning" : "danger"}>
                        {selectedParts.length} peça(s)
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-4xl border border-border/70 bg-background/25 p-4">
                  <p className="text-xs text-muted">Top peças</p>
                  <div className="mt-3 space-y-2">
                    {selectedParts.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3">
                        <p className="text-sm font-ui font-semibold tracking-tight truncate">
                          {p.brand ? `${p.brand} ` : ""}
                          {p.name}
                        </p>
                        <span className="text-xs text-muted shrink-0">
                          {partPriceLabel(p)}
                        </span>
                      </div>
                    ))}
                    {selectedParts.length === 0 ? (
                      <p className="text-sm text-muted">
                        Nenhuma peça selecionada ainda.
                      </p>
                    ) : null}
                  </div>
                </div>
              </PremiumCard>

              {!user ? (
                <div className="rounded-4xl border border-warning/30 bg-warning/10 p-4 text-sm text-muted">
                  Você pode montar a build sem login, mas para salvar precisa entrar com Google.
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
