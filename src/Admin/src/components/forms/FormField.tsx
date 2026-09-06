import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="lw-field">
      <label className="lw-field-label">
        {label}
        {required && <span className="lw-required">*</span>}
      </label>
      {children}
      {error && <div className="lw-error-message">{error}</div>}
    </div>
  )
}
