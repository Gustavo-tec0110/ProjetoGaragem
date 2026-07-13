"use client";

import { Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyCurrentUrl } from "@/hooks/use-copy-current-url";

export function ProjectShareActions({ title }: { title: string }) {
  const { copied, copyCurrentUrl } = useCopyCurrentUrl();

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

    await copyCurrentUrl();
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
      <Button type="button" size="sm" variant="outline" className="px-3 md:h-12 md:px-6" onClick={() => void copyCurrentUrl()}>
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
