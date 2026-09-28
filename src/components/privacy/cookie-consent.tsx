"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as React from "react";
import { Settings2, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "projeto-garagem:cookie-consent";
const OPEN_EVENT = "projeto-garagem:open-cookie-preferences";

type Consent = {
  version: 1;
  necessary: true;
  analytics: false;
  marketing: false;
  decidedAt: string;
};

function readConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<Consent>;
    return parsed.version === 1 && parsed.necessary === true ? parsed : null;
  } catch {
    return null;
  }
}

function saveConsent() {
  const consent: Consent = {
    version: 1,
    necessary: true,
    analytics: false,
    marketing: false,
    decidedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

function CookiePreferencesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed inset-x-4 bottom-4 z-[91] mx-auto max-h-[calc(100dvh-2rem)] w-auto max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-elevated outline-none sm:inset-0 sm:bottom-auto sm:m-auto sm:h-fit sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-title text-xl tracking-tight">Preferências de cookies</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted">
                Transparência sem opções enganosas: hoje não usamos analytics, publicidade comportamental ou pixels de marketing.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="rounded-xl p-2 text-muted hover:bg-background hover:text-foreground" aria-label="Fechar preferências de cookies">
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
              <p className="mt-2 leading-6 text-muted">Sessão de autenticação e a lembrança desta escolha. São necessários para entrar e manter o serviço funcionando.</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-ui font-semibold">Analytics e marketing</p>
                <span className="rounded-full bg-border/70 px-2 py-1 text-xs font-semibold text-muted">Não utilizados</span>
              </div>
              <p className="mt-2 leading-6 text-muted">Nenhuma tecnologia opcional está carregada neste momento. Se isso mudar, esta tela oferecerá controles antes de qualquer carregamento.</p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => { saveConsent(); onOpenChange(false); }}>Salvar preferência</Button>
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

  React.useEffect(() => {
    const initializeConsent = () => {
      setShowBanner(!readConsent());
      setReady(true);
    };
    const initializationTimer = window.setTimeout(initializeConsent, 0);
    const open = () => setPreferencesOpen(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.clearTimeout(initializationTimer);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, []);

  function decide() {
    saveConsent();
    setShowBanner(false);
  }

  if (!ready) return null;
  return (
    <>
      {showBanner ? (
        <section aria-label="Preferências de cookies" className="pg-cookie-consent fixed inset-x-3 z-[80] mx-auto w-auto max-w-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-elevated backdrop-blur-xl sm:p-5">
            <div className="flex gap-3">
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><ShieldCheck className="size-5" /></span>
              <div>
                <h2 className="font-title text-base tracking-tight">Sua privacidade na garagem</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Usamos apenas o necessário para autenticação e para lembrar esta escolha. Não há analytics ou rastreamento opcional em uso.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button type="button" variant="outline" className="order-2 sm:order-1" onClick={() => setPreferencesOpen(true)}><Settings2 className="size-4" />Preferências</Button>
              <Button type="button" variant="outline" onClick={decide}>Recusar opcionais</Button>
              <Button type="button" onClick={decide}>Aceitar</Button>
            </div>
          </div>
        </section>
      ) : null}
      <CookiePreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </>
  );
}

export function CookiePreferencesTrigger() {
  return (
    <button
      type="button"
      className="text-left text-muted transition hover:text-foreground"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      Gerenciar cookies
    </button>
  );
}
