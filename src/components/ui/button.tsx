"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-ui font-semibold tracking-tight transition-all pg-transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white shadow-glow hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:brightness-95",
        outline:
          "border border-border/80 bg-background-2/70 text-foreground hover:border-foreground/20 hover:bg-surface",
        secondary:
          "bg-surface text-foreground border border-border/60 hover:bg-card",
        ghost: "bg-transparent text-foreground hover:bg-foreground/[0.06]",
        danger: "bg-danger text-foreground hover:brightness-110",
        success: "bg-success text-foreground hover:brightness-110",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        default: "h-12 px-5 text-sm",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
