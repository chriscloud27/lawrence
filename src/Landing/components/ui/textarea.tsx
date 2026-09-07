import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full resize-y rounded-lw border border-lw-border bg-lw-bg-subtle px-[14px] py-[10px] font-sans text-[16px] text-lw-text placeholder:text-lw-text-muted transition-colors focus:outline-none focus:border-lw-accent focus:shadow-lw-focus disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
