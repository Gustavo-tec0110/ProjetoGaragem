"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { Copy, Download, Share2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function BuildShareModal({
  buildSlug,
  title,
  className,
}: {
  buildSlug: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [pageUrl, setPageUrl] = React.useState("");

  const ogUrl = `/api/og/${encodeURIComponent(buildSlug)}`;

  React.useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" className={cn(className)}>
          <Share2 className="size-4" />
          Compartilhar build
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-4 top-10 max-h-[calc(100vh-80px)] overflow-auto rounded-4xl pg-glass p-5 md:inset-x-0 md:left-1/2 md:max-w-3xl md:-translate-x-1/2 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="font-title text-xl tracking-tight truncate">
                Compartilhar
              </Dialog.Title>
              <p className="mt-1 text-sm text-muted truncate">{title}</p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/35 text-foreground hover:bg-background/55 transition"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-4xl border border-border/70 bg-background/25 overflow-hidden">
              <div className="relative aspect-[1200/630]">
                <Image
                  src={ogUrl}
                  alt={`Card compartilhável da build ${title}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 92vw, 760px"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Link</p>
                <p className="mt-1 text-sm text-muted break-all">
                  {pageUrl}
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const ok = await copyToClipboard(pageUrl);
                      setCopied(ok);
                      window.setTimeout(() => setCopied(false), 1200);
                    }}
                  >
                    <Copy className="size-4" />
                    {copied ? "Copiado" : "Copiar link"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={downloading}
                    onClick={async () => {
                      try {
                        setDownloadError(null);
                        setDownloading(true);
                        const res = await fetch(ogUrl, { method: "GET" });
                        if (!res.ok) throw new Error("Falha ao baixar imagem.");
                        const blob = await res.blob();
                        const href = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = href;
                        a.download = `projeto-garagem-${buildSlug}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(href);
                      } catch (e) {
                        setDownloadError(
                          e && typeof e === "object" && "message" in e && typeof e.message === "string"
                            ? e.message
                            : "Falha ao baixar."
                        );
                      } finally {
                        setDownloading(false);
                      }
                    }}
                  >
                    <Download className="size-4" />
                    {downloading ? "Baixando…" : "Baixar imagem"}
                  </Button>
                </div>

                {downloadError ? (
                  <p className="mt-2 text-xs text-danger">{downloadError}</p>
                ) : null}
              </div>

              <div className="rounded-4xl border border-border/70 bg-background/25 p-4">
                <p className="text-xs text-muted">Compartilhar em</p>
                <div className="mt-3 grid gap-2">
                  <Button
                    type="button"
                    asChild
                    variant="outline"
                  >
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Minha build no ProjetoGaragem: ${pageUrl}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    type="button"
                    asChild
                    variant="outline"
                  >
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `Minha build no ProjetoGaragem: ${title}`
                      )}&url=${encodeURIComponent(
                        pageUrl
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Twitter/X
                    </a>
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  O preview usa o card gerado em <Badge variant="secondary">{ogUrl}</Badge>.
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
