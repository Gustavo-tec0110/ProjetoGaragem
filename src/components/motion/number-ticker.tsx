"use client";

import * as React from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

type SpringOptions = {
  stiffness?: number;
  damping?: number;
  mass?: number;
};

export function NumberTicker({
  value,
  className,
  decimals = 0,
  format,
  spring,
}: {
  value: number;
  className?: string;
  decimals?: number;
  format?: (value: number) => string;
  spring?: SpringOptions;
}) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, {
    stiffness: 170,
    damping: 28,
    mass: 0.6,
    ...spring,
  });

  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  React.useEffect(() => {
    if (reduceMotion) return;
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplay(latest);
    });
    return unsubscribe;
  }, [reduceMotion, springValue]);

  const effective = reduceMotion ? value : display;
  const formatted =
    format?.(effective) ??
    (decimals > 0 ? effective.toFixed(decimals) : Math.round(effective).toString());

  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}
