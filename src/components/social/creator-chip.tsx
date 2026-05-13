import Link from "next/link";

import {
  communityBadgeLabels,
  type CommunityBadgeId,
} from "@/lib/data/community";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeTone: Record<CommunityBadgeId, "secondary" | "warning" | "danger" | "success"> =
  {
    jdm_expert: "warning",
    drift_builder: "danger",
    sleeper_master: "secondary",
    turbo_lover: "success",
  };

export function CreatorChip({
  name,
  handle,
  badges,
  className,
}: {
  name: string;
  handle: string;
  badges: CommunityBadgeId[];
  className?: string;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase();

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <Link href={`/perfil/${handle}`} className="flex items-center gap-3 min-w-0">
        <span className="inline-flex size-10 items-center justify-center rounded-3xl border border-border/70 bg-background/35 shadow-glow font-ui font-semibold">
          {initial}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-ui font-semibold tracking-tight truncate">
            {name}
          </p>
          <p className="text-xs text-muted truncate">@{handle}</p>
        </div>
      </Link>

      <div className="hidden sm:flex flex-wrap justify-end gap-2">
        {badges.slice(0, 2).map((b) => (
          <Badge key={b} variant={badgeTone[b]}>
            {communityBadgeLabels[b]}
          </Badge>
        ))}
      </div>
    </div>
  );
}

