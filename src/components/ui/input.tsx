"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-12 w-full rounded-3xl border border-border/70 bg-background/35 px-4 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent/45 focus:shadow-glow",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
