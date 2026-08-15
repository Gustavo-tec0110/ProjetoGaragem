"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type PremiumCardProps = React.HTMLAttributes<HTMLDivElement>;

export function PremiumCard({ className, children, ...props }: PremiumCardProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const rectRef = React.useRef<DOMRect | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const pointerRef = React.useRef({ x: 0, y: 0 });

  const updatePointerEffect = React.useCallback(() => {
    frameRef.current = null;
    const el = ref.current;
    const rect = rectRef.current;
    if (!el || !rect) return;
    const x = ((pointerRef.current.x - rect.left) / Math.max(1, rect.width)) * 100;
    const y = ((pointerRef.current.y - rect.top) / Math.max(1, rect.height)) * 100;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
  }, []);

  React.useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  return (
    <div
      ref={ref}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        rectRef.current = ref.current?.getBoundingClientRect() ?? null;
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        pointerRef.current = { x: e.clientX, y: e.clientY };
        if (frameRef.current === null) {
          frameRef.current = requestAnimationFrame(updatePointerEffect);
        }
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el) return;
        rectRef.current = null;
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      }}
      className={cn("pg-glass overflow-hidden rounded-2xl pg-premium-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

