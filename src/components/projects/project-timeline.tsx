"use client";

import { Calendar, Coins } from "lucide-react";

import { ProjectImage } from "@/components/projects/project-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/projects/types";
import { formatProjectCurrency, formatProjectDate } from "@/lib/projects/utils";

export function ProjectTimeline({ project }: { project: Project }) {
  const timelineTotal = project.updates.reduce(
    (sum, update) => sum + Math.max(0, update.amount ?? 0),
    0
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted">Atualizacoes</p>
          <p className="mt-1 font-title text-2xl">{project.updatesCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Investimento na timeline</p>
          <p className="mt-1 font-title text-2xl">
            {formatProjectCurrency(timelineTotal || project.totalInvested)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Ultima evolucao</p>
          <p className="mt-1 font-title text-2xl">
            {formatProjectDate(project.lastUpdateAt)}
          </p>
        </Card>
      </div>

      {project.updates.length ? (
        <div className="space-y-4">
          {project.updates.map((update, index) => (
            <Card key={update.id} className="overflow-hidden">
              <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
                <div className="relative min-h-52 bg-surface">
                  {update.photo ? (
                    <ProjectImage
                      src={update.photo}
                      alt={`Atualizacao ${update.title}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 40vw, 100vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-background/10 to-background/60" />
                  )}
                </div>

                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Etapa {project.updatesCount - index}</Badge>
                    <Badge>
                      <Calendar className="size-3" />
                      {formatProjectDate(update.date)}
                    </Badge>
                    {update.amount ? (
                      <Badge variant="success">
                        <Coins className="size-3" />
                        {formatProjectCurrency(update.amount)}
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="mt-4 font-title text-2xl tracking-tight">
                    {update.title}
                  </h3>
                  <p className="mt-3 text-sm text-foreground/85">{update.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
          Ainda nao existem atualizacoes publicadas na timeline deste projeto.
        </div>
      )}
    </div>
  );
}
