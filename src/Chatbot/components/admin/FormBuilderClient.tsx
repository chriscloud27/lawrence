"use client";

// Ported from src/Admin/src/screens/FormBuilder.tsx.
//
// The form templates below are local fixtures, not mock-data.ts revived: intake
// form templates have no table yet (ADR-0010 puts the form intake path in v2),
// so there is nothing to read and — per this step's Do Not — nothing to write.
// Every action reports itself as a prototype no-op rather than pretending.

import { useState } from "react";
import Link from "next/link";
import {
  AlignLeft,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Eye,
  GripVertical,
  Mail,
  Tag,
  ToggleLeft,
  Type,
  Upload,
  X,
} from "lucide-react";
import type { FormStatus, IntakeFormTemplate } from "@/types/lawrence";
import {
  ageOptions,
  budgetOptions,
  impetusOptions,
  timelineOptions,
} from "@/lib/admin/form-options";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  FIELD_LABEL,
  FOOTER_NOTE,
  INPUT,
  LINK_BTN,
  PILL,
  SELECT,
  TEXTAREA,
} from "@/components/admin/ui";

type FieldType = "text" | "email" | "dropdown" | "chips" | "tags" | "textarea" | "file" | "date";
type BantMapping = "None" | "Budget" | "Authority" | "Need" | "Timeline";

interface BuilderField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  helpText: string;
  bant: BantMapping;
  options?: string[];
}

const PALETTE: { type: FieldType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text Input", icon: Type },
  { type: "email", label: "Email", icon: Mail },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "chips", label: "Multi-Select Chips", icon: ToggleLeft },
  { type: "tags", label: "Tag Input", icon: Tag },
  { type: "textarea", label: "Textarea", icon: AlignLeft },
  { type: "file", label: "File Upload", icon: Upload },
  { type: "date", label: "Date Picker", icon: Calendar },
];

const BANT_OPTIONS: BantMapping[] = ["None", "Budget", "Authority", "Need", "Timeline"];

const TEMPLATES: IntakeFormTemplate[] = [
  {
    id: "form-001",
    name: "Standard Intake",
    fieldCount: 8,
    submissions: 847,
    completionRate: 0.64,
    status: "live",
    lastEdited: "2026-08-01T10:00:00Z",
    isDefault: true,
  },
  {
    id: "form-002",
    name: "Short Form — Boarding Only",
    fieldCount: 5,
    submissions: 123,
    completionRate: 0.78,
    status: "live",
    lastEdited: "2026-08-05T15:30:00Z",
    isDefault: false,
  },
  {
    id: "form-003",
    name: "University Pathway",
    fieldCount: 10,
    submissions: 0,
    completionRate: 0,
    status: "draft",
    lastEdited: "2026-08-18T09:00:00Z",
    isDefault: false,
  },
];

const SAMPLE_FIELDS: BuilderField[] = [
  { id: "field-001", type: "text", label: "Your name", placeholder: "Jane Mitchell", required: true, helpText: "", bant: "None" },
  { id: "field-002", type: "dropdown", label: "Child's age", placeholder: "Select an option", required: true, helpText: "", bant: "Need", options: ageOptions },
  { id: "field-003", type: "dropdown", label: "Budget range", placeholder: "Select an option", required: true, helpText: "Per year, including boarding fees where relevant.", bant: "Budget", options: budgetOptions },
  { id: "field-004", type: "dropdown", label: "Why are you looking?", placeholder: "Select an option", required: true, helpText: "", bant: "Need", options: impetusOptions },
  { id: "field-005", type: "dropdown", label: "When does your child need to start?", placeholder: "Select an option", required: true, helpText: "", bant: "Timeline", options: timelineOptions },
];

const STATUS_LABEL: Record<FormStatus, string> = {
  live: "Live",
  draft: "Draft",
  "ab-test": "A/B Test",
};

// Diagnostic, never interactive (.claude/rules/design.md). Outlined rather than
// tinted: the score-band backgrounds belong to qualification signals, and a form's
// publish state is not one.
const STATUS_PILL: Record<FormStatus, string> = {
  live: "border border-lw-success text-lw-success",
  draft: "border border-lw-border text-lw-text-muted",
  "ab-test": "border border-lw-warning text-lw-warning",
};

function FieldPreview({ field }: { field: BuilderField }) {
  return (
    <>
      <label className={FIELD_LABEL}>
        {field.label}
        {field.required && <span className="ml-[2px] text-lw-error">*</span>}
      </label>
      {field.type === "dropdown" ? (
        <select className={SELECT} defaultValue="">
          <option value="" disabled>
            {field.placeholder || "Select an option"}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea className={TEXTAREA} rows={3} placeholder={field.placeholder} />
      ) : (
        <input
          className={INPUT}
          type={field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
          placeholder={field.placeholder}
        />
      )}
      {field.helpText && <div className="mt-lw-xs text-[13px] text-lw-text-muted">{field.helpText}</div>}
    </>
  );
}

export function FormBuilderClient({ formId }: { formId: string }) {
  const template = TEMPLATES.find((t) => t.id === formId) ?? TEMPLATES[0];

  const [formName, setFormName] = useState(template.name);
  const [fields, setFields] = useState<BuilderField[]>(SAMPLE_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const updateSelected = <K extends keyof BuilderField>(key: K, value: BuilderField[K]) => {
    if (!selectedFieldId) return;
    setFields((prev) => prev.map((f) => (f.id === selectedFieldId ? { ...f, [key]: value } : f)));
  };

  const handleDrop = (targetId: string) => {
    if (!dragFieldId || dragFieldId === targetId) return;
    setFields((prev) => {
      const from = prev.findIndex((f) => f.id === dragFieldId);
      const to = prev.findIndex((f) => f.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragFieldId(null);
  };

  return (
    <div className="mx-auto max-w-[1280px] p-lw-xl max-[640px]:px-lw-base max-[640px]:pt-lw-lg max-[640px]:pb-lw-2xl">
      <div className="mb-lw-lg flex items-center justify-between gap-lw-base border-b border-lw-border-subtle pb-lw-lg max-[640px]:flex-col max-[640px]:items-stretch">
        <Link href="/admin" className={LINK_BTN}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-lw-md max-[640px]:flex-col max-[640px]:items-stretch">
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => notify("Saved as draft (prototype — nothing saved)")}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => notify("Published (prototype — nothing saved)")}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="mb-lw-lg flex flex-wrap gap-lw-sm">
        {TEMPLATES.map((item) => (
          <Link
            key={item.id}
            href={`/admin/forms/${item.id}/build`}
            className={`flex items-center gap-lw-sm rounded-lw px-lw-md py-lw-sm text-sm ${
              item.id === template.id
                ? "bg-lw-accent-subtle text-lw-accent"
                : "bg-lw-bg-card text-lw-text-secondary"
            }`}
          >
            {item.name}
            <span className={`${PILL} ${STATUS_PILL[item.status]}`}>{STATUS_LABEL[item.status]}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-[200px_minmax(0,1fr)_260px] items-start gap-lw-lg max-[1023px]:grid-cols-[minmax(0,1fr)]">
        <div>
          <div className="mb-lw-md text-sm font-semibold text-lw-text">Add Field</div>
          <div className="flex flex-col gap-lw-sm">
            {PALETTE.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                className="flex cursor-grab items-center gap-[10px] rounded-lw bg-lw-bg-card px-lw-md py-lw-sm text-left text-[13px] text-lw-text hover:bg-lw-bg-subtle max-[640px]:min-h-12"
                onClick={() => notify(`${label} palette is a prototype — nothing added`)}
              >
                <span className="flex shrink-0 text-lw-text-muted">
                  <Icon size={16} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-lw-base flex flex-wrap items-center justify-between gap-lw-md max-[640px]:flex-col max-[640px]:items-stretch">
            <input
              type="text"
              aria-label="Form name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="h-10 min-w-[200px] flex-[1_1_200px] rounded-lw border border-transparent bg-transparent px-lw-md text-lg font-semibold text-lw-text outline-none hover:border-lw-border focus:border-lw-accent focus:bg-lw-bg-subtle focus:shadow-lw-focus"
            />
            <button
              type="button"
              className={`${BTN_SECONDARY} shrink-0`}
              onClick={() => setShowPreview(true)}
            >
              <Eye size={16} />
              Preview as parent
            </button>
          </div>

          <div className="rounded-lw-lg border border-lw-border bg-lw-bg-subtle p-lw-lg">
            {fields.map((field) => (
              <div
                key={field.id}
                onClick={() => setSelectedFieldId(field.id)}
                draggable
                onDragStart={() => setDragFieldId(field.id)}
                onDragEnd={() => setDragFieldId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(field.id)}
                className={`flex cursor-pointer items-start gap-[10px] rounded-lw border-l-[3px] p-lw-md ${
                  selectedFieldId === field.id
                    ? "border-l-lw-accent bg-lw-bg-card"
                    : "border-l-transparent hover:bg-lw-bg-card"
                } ${dragFieldId === field.id ? "opacity-50" : ""}`}
              >
                <span className="mt-[26px] flex shrink-0 cursor-grab text-lw-text-muted">
                  <GripVertical size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <FieldPreview field={field} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-lw-md text-sm font-semibold text-lw-text">Field Settings</div>
          <div className="rounded-lw-lg bg-lw-bg-card p-lw-lg">
            {!selectedField ? (
              <div className="flex min-h-[120px] items-center justify-center text-center text-sm text-lw-text-muted">
                Select a field to configure
              </div>
            ) : (
              <>
                <div className="mb-lw-lg">
                  <label className={FIELD_LABEL}>Label</label>
                  <input
                    type="text"
                    className={INPUT}
                    value={selectedField.label}
                    onChange={(e) => updateSelected("label", e.target.value)}
                  />
                </div>

                <div className="mb-lw-lg">
                  <label className={FIELD_LABEL}>Placeholder</label>
                  <input
                    type="text"
                    className={INPUT}
                    value={selectedField.placeholder}
                    onChange={(e) => updateSelected("placeholder", e.target.value)}
                  />
                </div>

                <div className="mb-lw-lg flex items-center justify-between gap-lw-md">
                  <span className="text-sm font-medium text-lw-text">Required</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedField.required}
                    aria-label="Required"
                    onClick={() => updateSelected("required", !selectedField.required)}
                    className={`h-[22px] w-10 shrink-0 cursor-pointer rounded-full border p-[2px] transition-colors max-[640px]:h-7 max-[640px]:w-12 ${
                      selectedField.required
                        ? "border-lw-accent bg-lw-accent"
                        : "border-lw-border bg-lw-bg-subtle"
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full transition-transform max-[640px]:h-[22px] max-[640px]:w-[22px] ${
                        selectedField.required
                          ? "translate-x-[18px] bg-lw-text-on-accent max-[640px]:translate-x-5"
                          : "bg-lw-bg"
                      }`}
                    />
                  </button>
                </div>

                <div className="mb-lw-lg">
                  <label className={FIELD_LABEL}>Help text</label>
                  <input
                    type="text"
                    className={INPUT}
                    value={selectedField.helpText}
                    onChange={(e) => updateSelected("helpText", e.target.value)}
                  />
                </div>

                <div>
                  <label className={FIELD_LABEL}>BANT Mapping</label>
                  <select
                    className={SELECT}
                    value={selectedField.bant}
                    onChange={(e) => updateSelected("bant", e.target.value as BantMapping)}
                  >
                    {BANT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Form preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-lw-lg"
        >
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setShowPreview(false)}
            className="absolute inset-0 cursor-default bg-lw-bg opacity-95"
          />
          <div className="relative max-h-[80vh] w-full max-w-[560px] overflow-y-auto rounded-lw-lg border border-lw-border bg-lw-bg-elevated p-lw-xl shadow-lw-lg">
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setShowPreview(false)}
              className="absolute right-lw-base top-lw-base flex h-8 w-8 cursor-pointer items-center justify-center rounded-lw text-lw-text-muted hover:bg-lw-bg-subtle hover:text-lw-text"
            >
              <X size={18} />
            </button>
            <div className="mb-lw-lg pr-10 text-lg font-semibold text-lw-text">{formName}</div>
            {fields.map((field) => (
              <div className="mb-lw-lg" key={field.id}>
                <FieldPreview field={field} />
              </div>
            ))}
            <div className={FOOTER_NOTE}>Powered by Lawrence</div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-lw-lg left-1/2 z-[60] -translate-x-1/2 rounded-lw border border-lw-border bg-lw-bg-card px-lw-lg py-lw-md text-sm font-medium text-lw-text shadow-lw-md"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
