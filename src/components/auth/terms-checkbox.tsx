"use client";

import Link from "next/link";
import { LEGAL_VERSION_NOTICE, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/auth/legal";

export function TermsCheckbox({ checked, onChange, invalid = false }: {
  checked: boolean; onChange: (checked: boolean) => void; invalid?: boolean;
}) {
  return <div className="space-y-2">
    <div className="flex items-start gap-3 text-sm leading-6 text-foreground/85">
      <input id="accept-terms" name="acceptTerms" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}
        aria-label="Li e aceito os Termos de Uso e estou ciente da Política de Privacidade." aria-required="true" aria-invalid={invalid} aria-describedby={invalid ? "terms-error" : "legal-version"}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" />
      <div><label htmlFor="accept-terms">Li e aceito os </label>
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-accent">Termos de Uso</Link>
        <label htmlFor="accept-terms"> e estou ciente da </label>
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-accent">Política de Privacidade</Link>.
      </div>
    </div>
    <p id="legal-version" className="text-[11px] text-muted">{LEGAL_VERSION_NOTICE} Termos: {TERMS_VERSION}; privacidade: {PRIVACY_VERSION}.</p>
  </div>;
}
