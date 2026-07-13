"use client";

import * as React from "react";
import { Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ProjectShareActions({ title }: { title: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copyLink() {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareProject() {
    const payload = {
      title,
      text: `Olha este projeto no Projeto Garagem: ${title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return;
      }
    }

    await copyLink();
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
      <Button type="button" size="sm" variant="outline" className="px-3 md:h-12 md:px-6" onClick={() => void copyLink()}>
        <Copy className="size-4" />
        {copied ? "Link copiado" : "Copiar link"}
      </Button>
      <Button type="button" size="sm" className="px-3 md:h-12 md:px-6" onClick={() => void shareProject()}>
        <Share2 className="size-4" />
        Compartilhar projeto
      </Button>
    </div>
  );
}
