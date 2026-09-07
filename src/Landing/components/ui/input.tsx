import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lw border border-lw-border bg-lw-bg-subtle px-[14px] py-[10px] font-sans text-[16px] text-lw-text placeholder:text-lw-text-muted transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none focus:border-lw-accent focus:shadow-lw-focus disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
