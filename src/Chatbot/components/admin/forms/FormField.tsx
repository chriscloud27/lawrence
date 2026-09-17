import type { ReactNode } from "react";
import { FIELD_LABEL } from "@/components/admin/ui";

export function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-lw-lg">
      <label className={FIELD_LABEL}>
        {label}
        {required && <span className="ml-[2px] text-lw-error">*</span>}
      </label>
      {children}
      {error && <div className="mt-lw-xs text-[13px] text-lw-error">{error}</div>}
    </div>
  );
}
