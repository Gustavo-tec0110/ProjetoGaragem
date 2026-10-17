"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "projeto-garagem:cookie-consent";
const OPEN_EVENT = "projeto-garagem:open-cookie-preferences";

type Consent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  marketing: false;
  decidedAt: string;
};

function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Consent>;
    if (parsed.version !== 1 || parsed.necessary !== true || typeof parsed.analytics !== "boolean") return null;
    return { version: 1, necessary: true, analytics: parsed.analytics, marketing: false, decidedAt: parsed.decidedAt ?? "" };
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean) {
  const consent: Consent = {
    version: 1,
    necessary: true,
    analytics,
    marketing: false,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

function CookiePreferencesDialog({
  open,
  onOpenChange,
  analyticsEnabled,
  onAnalyticsChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analyticsEnabled: boolean;
  onAnalyticsChange: (enabled: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 z-[91] mx-auto max-h-[calc(100dvh-2rem)] w-auto max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-elevated outline-none sm:inset-0 sm:bottom-auto sm:m-auto sm:h-fit sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-title text-xl tracking-tight">Preferências de cookies</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                Escolha o uso de estatísticas. Cookies essenciais permanecem ativos para a conta e para lembrar sua escolha.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-xl p-2 text-muted hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Fechar preferências de cookies">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-ui font-semibold">Essenciais</p>
                <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">Sempre ativos</span>
              </div>
              <p className="mt-2 leading-6 text-muted">Mantêm a sessão e registram sua preferência de cookies.</p>
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background/30 p-4">
              <span>
                <span className="block font-ui font-semibold">Estatísticas de acesso</span>
                <span className="mt-1 block leading-6 text-muted">Opcional e desligado por padrão. Nenhum serviço de analytics está integrado no momento; sua escolha pode ser alterada aqui depois.</span>
              </span>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(event) => onAnalyticsChange(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-accent"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={onSave}>Salvar preferência</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CookieConsent() {
  const [ready, setReady] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(false);
  const [preferencesOpen, setPreferencesOpen] = React.useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(false);

  React.useEffect(() => {
    const initializeConsent = () => {
      const consent = readConsent();
      setShowBanner(!consent);
      setAnalyticsEnabled(consent?.analytics ?? false);
      setReady(true);
    };
    const initializationTimer = window.setTimeout(initializeConsent, 0);
    const open = () => {
      setAnalyticsEnabled(readConsent()?.analytics ?? false);
      setPreferencesOpen(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.clearTimeout(initializationTimer);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, []);

  function decide(analytics: boolean) {
    saveConsent(analytics);
    setAnalyticsEnabled(analytics);
    setShowBanner(false);
    setPreferencesOpen(false);
  }

  function openPreferences() {
    setAnalyticsEnabled(readConsent()?.analytics ?? false);
    setPreferencesOpen(true);
  }

  if (!ready) return null;
  return (
    <>
      {showBanner ? (
        <section aria-label="Preferências de cookies" className="pg-cookie-consent fixed inset-x-3 z-[80] mx-auto w-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-elevated backdrop-blur-xl sm:px-5 sm:py-4">
            <h2 className="font-title text-base font-semibold tracking-tight">Utilizamos cookies</h2>
            <p className="mt-1 text-sm leading-5 text-muted">Usamos cookies para melhorar sua experiência. Ao aceitar, você permite o uso de cookies opcionais.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">Política de Privacidade</Link>
                <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">Termos de Uso</Link>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                <Button type="button" size="sm" onClick={() => decide(true)}>Aceitar</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => decide(false)}>Recusar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={openPreferences}>Configurar</Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      <CookiePreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        analyticsEnabled={analyticsEnabled}
        onAnalyticsChange={setAnalyticsEnabled}
        onSave={() => decide(analyticsEnabled)}
      />
    </>
  );
}

export function CookiePreferencesTrigger() {
  return (
    <button
      type="button"
      className="text-left text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      Gerenciar cookies
    </button>
  );
}
