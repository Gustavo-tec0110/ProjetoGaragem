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
          "pg-control h-12 w-full rounded-xl px-4 text-sm placeholder:text-muted/75 outline-none",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
