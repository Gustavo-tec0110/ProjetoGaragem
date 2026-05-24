"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useSupabaseUser } from "@/lib/supabase/use-user";
import { cn } from "@/lib/utils";

type CarLite = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  year_start: number;
  year_end: number | null;
};

function normalize(value: string) {
  try {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function sanitizeUsername(input: string) {
  const normalized = normalize(input)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return normalized.slice(0, 24);
}

export function OnboardingForm() {
  const router = useRouter();
  const { user, loading, configured } = useSupabaseUser();
  const supabase = getSupabaseBrowserClient();

  const [cars, setCars] = React.useState<CarLite[]>([]);
  const [carsLoading, setCarsLoading] = React.useState(false);

  const [usernameRaw, setUsernameRaw] = React.useState("");
  const username = sanitizeUsername(usernameRaw);

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [selectedCars, setSelectedCars] = React.useState<string[]>([]);

  const [checkingUsername, setCheckingUsername] = React.useState(false);
  const [usernameTaken, setUsernameTaken] = React.useState<boolean | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    setDisplayName(user.user_metadata?.full_name ?? user.email ?? "");
    setBio("");
  }, [user]);

  React.useEffect(() => {
    if (!supabase) return;
    setCarsLoading(true);
    void supabase
      .from("cars")
      .select("id, slug, name, category, year_start, year_end")
      .order("brand", { ascending: true })
      .order("model", { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        setCars((data ?? []) as CarLite[]);
      })
      .finally(() => setCarsLoading(false));
  }, [supabase]);

  // Se já existe perfil, pula onboarding
  React.useEffect(() => {
    if (!supabase || !user) return;
    void supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) router.replace("/perfil");
      });
  }, [router, supabase, user]);

  // Valida se username está disponível (debounce)
  React.useEffect(() => {
    if (!supabase) return;
    if (!username || username.length < 3) {
      setUsernameTaken(null);
      return;
    }

    setCheckingUsername(true);
    setUsernameTaken(null);

    const handle = window.setTimeout(() => {
      void supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) return;
          setUsernameTaken(Boolean(data?.id));
        })
        .finally(() => setCheckingUsername(false));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [supabase, username]);

  if (!configured) {
    return (
      <Card className="p-6 md:p-8">
        <p className="text-xs text-muted">Onboarding</p>
        <h1 className="mt-2 font-title text-2xl tracking-tight">
          Configure o Supabase primeiro
        </h1>
        <p className="mt-2 text-sm text-muted">
          Para criar perfil, configure <span className="text-foreground font-semibold">.env.local</span> com{" "}
          <span className="text-foreground font-semibold">NEXT_PUBLIC_SUPABASE_URL</span> e{" "}
          <span className="text-foreground font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-4xl" />
        <Skeleton className="h-24 rounded-4xl" />
      </div>
    );
  }

  if (!user || !supabase) {
    return (
      <Card className="p-6 md:p-8">
        <p className="text-xs text-muted">Onboarding</p>
        <h1 className="mt-2 font-title text-2xl tracking-tight">
          Você precisa estar logado
        </h1>
        <p className="mt-2 text-sm text-muted">
          Entre com Google para criar seu perfil.
        </p>
        <div className="mt-6 flex gap-2">
          <Button className="flex-1" onClick={() => router.push("/login")}>
            Ir para login
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/montar")}
          >
            Continuar sem login
          </Button>
        </div>
      </Card>
    );
  }

  const usernameOk = username.length >= 3 && usernameTaken === false;
  const canSubmit =
    usernameOk &&
    displayName.trim().length > 0 &&
    selectedCars.length > 0 &&
    !busy;

  return (
    <Card className="p-6 md:p-8">
      <p className="text-xs text-muted">Bem-vindo</p>
      <h1 className="mt-2 font-title text-2xl tracking-tight">
        Finalize seu perfil
      </h1>
      <p className="mt-2 text-sm text-muted">
        Escolha seu <span className="text-foreground font-semibold">username</span>, adicione um carro e pronto.
      </p>

      <div className="mt-6 grid gap-4">
        <div>
          <label className="text-xs text-muted">Username</label>
          <Input
            value={usernameRaw}
            onChange={(e) => setUsernameRaw(e.target.value)}
            placeholder="ex: meu-civic-g8"
            className="mt-2"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">
              Fica assim: <span className="text-foreground font-semibold">@{username || "..."}</span>
            </span>
            {checkingUsername ? (
              <span className="inline-flex items-center gap-2 text-muted">
                <Loader2 className="size-3 animate-spin" /> verificando…
              </span>
            ) : username.length >= 3 && usernameTaken === false ? (
              <span className="inline-flex items-center gap-2 text-success">
                <Check className="size-3" /> disponível
              </span>
            ) : username.length >= 3 && usernameTaken === true ? (
              <span className="text-danger">já está em uso</span>
            ) : (
              <span className="text-muted">mín. 3 caracteres</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted">Nome de exibição</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Seu nome"
            className="mt-2"
          />
        </div>

        <div>
          <label className="text-xs text-muted">Bio (opcional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Curto, direto e brasileiro."
            className="mt-2 pg-control min-h-[96px] w-full resize-none rounded-3xl px-4 py-3 text-sm placeholder:text-muted outline-none"
          />
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Carros na garagem</p>
              <p className="mt-1 text-sm text-muted">
                Selecione pelo menos 1 carro para começar.
              </p>
            </div>
            <span className="text-xs text-muted">
              {selectedCars.length} selecionado(s)
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {carsLoading ? (
              <>
                <Skeleton className="h-16 rounded-4xl" />
                <Skeleton className="h-16 rounded-4xl" />
                <Skeleton className="h-16 rounded-4xl" />
                <Skeleton className="h-16 rounded-4xl" />
              </>
            ) : (
              cars.map((car) => {
                const checked = selectedCars.includes(car.slug);
                return (
                  <button
                    key={car.slug}
                    type="button"
                    className={cn(
                      "text-left rounded-4xl border px-4 py-3 transition active:scale-[0.99]",
                      checked
                        ? "border-accent/30 bg-accent/10 shadow-glow"
                        : "border-border/70 bg-background/25 hover:bg-background/40"
                    )}
                    onClick={() =>
                      setSelectedCars((prev) =>
                        checked
                          ? prev.filter((slug) => slug !== car.slug)
                          : [...prev, car.slug]
                      )
                    }
                  >
                    <p className="text-sm font-ui font-semibold tracking-tight">
                      {car.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {car.category ?? "carro"} • {car.year_start}
                      {car.year_end ? `–${car.year_end}` : "+"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {submitError ? (
          <div className="rounded-4xl border border-danger/30 bg-danger/10 p-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 size-5 text-danger" />
              <p className="text-sm text-muted">{submitError}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="sm:flex-1"
            disabled={!canSubmit}
            onClick={async () => {
              setSubmitError(null);
              setBusy(true);

              const payload = {
                id: user.id,
                username,
                display_name: displayName.trim(),
                avatar_url: user.user_metadata?.avatar_url ?? null,
                bio: bio.trim() ? bio.trim() : null,
                garage_car_slugs: selectedCars,
                car_count: selectedCars.length,
              };

              const { error } = await supabase.from("profiles").insert(payload);
              if (error) {
                setSubmitError(error.message);
                setBusy(false);
                return;
              }

              router.replace("/perfil");
            }}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Criar perfil"
            )}
          </Button>
          <Button
            variant="outline"
            className="sm:flex-1"
            disabled={busy}
            onClick={() => router.push("/montar")}
          >
            Fazer depois
          </Button>
        </div>
      </div>
    </Card>
  );
}

