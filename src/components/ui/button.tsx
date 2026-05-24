"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-3xl font-ui font-semibold tracking-tight transition-all pg-transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-foreground shadow-glow hover:brightness-110 active:brightness-95",
        outline:
          "border border-border/70 bg-background/35 text-foreground hover:bg-background/55",
        secondary:
          "bg-background/55 text-foreground border border-border/70 hover:bg-background/70",
        ghost: "bg-transparent text-foreground hover:bg-background/40",
        danger: "bg-danger text-foreground hover:brightness-110",
        success: "bg-success text-foreground hover:brightness-110",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        default: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-12",
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
