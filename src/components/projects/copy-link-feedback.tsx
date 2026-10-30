"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";

export function CopyLinkFeedback({ copied, manualUrl }: { copied: boolean; manualUrl: string }) {
  const id = useId();
  return <div className={manualUrl ? "col-span-full w-full min-w-0 space-y-2 text-sm" : "sr-only"}>
    <p role="status" aria-live="polite">{manualUrl ? "Não foi possível copiar o link automaticamente. Selecione o endereço abaixo para copiar manualmente." : copied ? "Link copiado" : ""}</p>
    {manualUrl ? <><label htmlFor={id} className="block text-xs text-muted">Link do projeto</label><Input id={id} readOnly value={manualUrl} onFocus={(event) => event.currentTarget.select()} onClick={(event) => event.currentTarget.select()} /></> : null}
  </div>;
}
