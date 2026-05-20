"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { encodeBuildShare } from "@/lib/share/build-share";
import { cn } from "@/lib/utils";
import { useBuildsStore } from "@/stores/builds-store";

async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function SavedBuildsGrid({ className }: { className?: string }) {
  const { builds, order, removeBuild } = useBuildsStore();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!copiedId) return;
    const t = window.setTimeout(() => setCopiedId(null), 1400);
    return () => window.clearTimeout(t);
  }, [copiedId]);

  if (order.length === 0) {
    return (
      <div className={cn("rounded-4xl border border-border/70 bg-background/25 p-6 text-sm text-muted", className)}>
        Nenhuma build salva ainda. Monte uma build em <Link className="text-foreground underline" href="/montar">/montar</Link>{" "}
        e clique em <span className="text-foreground font-semibold">Salvar build</span>.
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {order.map((id) => {
        const item = builds[id];
        if (!item) return null;

        const share = encodeBuildShare(item.build);
        const href = `/builds/${item.build.id}?data=${share}`;
        const copied = copiedId === item.id;

        return (
          <PremiumCard key={item.id} className="p-6">
            <p className="text-xs text-muted">Build salva</p>
            <p className="mt-2 font-title tracking-tight text-lg">{item.title}</p>
            <p className="mt-1 text-sm text-muted">Salva em {formatDate(item.createdAt)}</p>

            <div className="mt-5 grid gap-2">
              <Button asChild>
                <Link href={href}>Abrir pÃ¡gina pÃºblica</Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const url = `${window.location.origin}${href}`;
                    const ok = await copyToClipboard(url);
                    if (ok) setCopiedId(item.id);
                  }}
                >
                  <Copy className="size-4" />
                  {copied ? "Copiado!" : "Compartilhar"}
                </Button>
                <Button variant="danger" onClick={() => removeBuild(item.id)}>
                  <Trash2 className="size-4" />
                  Remover
                </Button>
              </div>
            </div>
          </PremiumCard>
        );
      })}
    </div>
  );
}

