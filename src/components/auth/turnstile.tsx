"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTCHA_UNAVAILABLE, captchaConfiguration } from "@/lib/auth/captcha";

type TurnstileAPI = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileAPI } }
let loader: Promise<TurnstileAPI> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loader) return loader;
  loader = new Promise<TurnstileAPI>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const fail = () => { window.clearTimeout(timeout); script.remove(); loader = undefined; reject(new Error(CAPTCHA_UNAVAILABLE)); };
    const timeout = window.setTimeout(fail, 15_000);
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.turnstile) resolve(window.turnstile); else fail();
    };
    document.head.appendChild(script);
  });
  return loader;
}

export function useCaptcha() {
  const [token, setToken] = useState("");
  const [generation, setGeneration] = useState(0);
  const reset = useCallback(() => { setToken(""); setGeneration((value) => value + 1); }, []);
  return { token, setToken, generation, reset };
}

export function Turnstile({ onToken, generation }: { onToken: (token: string) => void; generation: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let widget: string | undefined;
    let api: TurnstileAPI | undefined;
    const fail = (message: string) => { if (active) { onToken(""); setError(message); } };
    void (async () => {
      const configuration = captchaConfiguration(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        process.env.NEXT_PUBLIC_TURNSTILE_MODE, window.location.hostname);
      if (configuration.error) throw new Error(configuration.error);
      api = await loadTurnstile();
      if (!active || !container.current) return;
      // Flexible requires >=300px. Compact (150px) fits the existing 320px shell.
      widget = api.render(container.current, {
        sitekey: configuration.siteKey, theme: "dark", size: container.current.clientWidth < 300 ? "compact" : "flexible", language: "pt-br",
        "response-field": false,
        callback: (token: string) => { if (active) { onToken(token); setError(""); } },
        "expired-callback": () => fail("A verificação expirou. Refaça o desafio."),
        "error-callback": () => fail(CAPTCHA_UNAVAILABLE),
        "timeout-callback": () => fail("A verificação expirou. Refaça o desafio."),
      });
    })().catch(() => fail(CAPTCHA_UNAVAILABLE));
    return () => { active = false; if (widget !== undefined) api?.remove(widget); };
  }, [onToken, generation, retry]);

  return <div className="min-w-0 space-y-2" aria-label="Verificação de segurança">
    <div ref={container} className="w-full min-w-0" />
    {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
    <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      onClick={() => { onToken(""); setError(""); setRetry((value) => value + 1); }}>Refazer verificação</button>
  </div>;
}
