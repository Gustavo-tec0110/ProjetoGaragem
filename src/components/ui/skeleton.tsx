import * as React from "react";

import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "pg-skeleton motion-reduce:animate-none rounded-3xl border border-border/50 bg-background/30",
        className
      )}
      {...props}
    />
  );
}

