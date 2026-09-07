import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-[10px] py-[4px] font-mono text-[11px] tracking-[.04em] uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-lw-border bg-lw-bg-card text-lw-text-secondary",
        accent: "border-transparent bg-lw-accent-subtle text-lw-accent",
        secondary: "border-lw-border-subtle bg-lw-bg-subtle text-lw-text-muted",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-lw-text border-lw-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
