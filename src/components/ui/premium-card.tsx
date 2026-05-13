"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type PremiumCardProps = React.HTMLAttributes<HTMLDivElement>;

export function PremiumCard({ className, children, ...props }: PremiumCardProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
        const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
        el.style.setProperty("--mx", `${x}%`);
        el.style.setProperty("--my", `${y}%`);
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      }}
      className={cn("pg-glass rounded-4xl shadow-elevated overflow-hidden pg-premium-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

