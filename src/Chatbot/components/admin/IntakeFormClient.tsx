"use client";

// Ported from src/Admin/src/screens/IntakeForm.tsx. Client because every field
// is controlled state with blur-time validation.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowRight } from "lucide-react";
import { FormField } from "@/components/admin/forms/FormField";
import { ChipSelect } from "@/components/admin/forms/ChipSelect";
import { TagInput } from "@/components/admin/forms/TagInput";
import { ProgressStepper } from "@/components/admin/forms/ProgressStepper";
import {
  INTAKE_FLOW_STEPS,
  ageOptions,
  boardingOptions,
  budgetOptions,
  curriculumOptions,
  impetusOptions,
  learningOptions,
  timelineOptions,
} from "@/lib/admin/form-options";
import {
  BTN_PRIMARY,
  CARD_WRAPPER,
  FOOTER_NOTE,
  INPUT,
  INPUT_ERROR,
  LINK_BTN,
  SELECT,
  TEXTAREA,
} from "@/components/admin/ui";

interface IntakeFormData {
  name: string;
  email: string;
  phone: string;
  childName: string;
  ageOrYear: string;
  timeline: string;
  budget: string;
  impetus: string;
  impetusOther: string;
  curriculum: string;
  boarding: string;
  nationalities: string[];
  regions: string[];
  learning: string;
  notes: string;
}

const INITIAL_DATA: IntakeFormData = {
  name: "",
  email: "",
  phone: "",
  childName: "",
  ageOrYear: "",
  timeline: "",
  budget: "",
  impetus: "",
  impetusOther: "",
  curriculum: "",
  boarding: "",
  nationalities: [],
  regions: [],
  learning: "",
  notes: "",
};

type RequiredField =
  | "name"
  | "email"
  | "childName"
  | "ageOrYear"
  | "timeline"
  | "budget"
  | "impetus"
  | "curriculum";

const REQUIRED_FIELDS: RequiredField[] = [
  "name",
  "email",
  "childName",
  "ageOrYear",
  "timeline",
  "budget",
  "impetus",
  "curriculum",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(field: RequiredField, data: IntakeFormData): string | undefined {
  switch (field) {
    case "name":
      return data.name.trim().length >= 2 ? undefined : "Please enter your full name.";
    case "email":
      return EMAIL_REGEX.test(data.email) ? undefined : "Please enter a valid email address.";
    case "childName":
      return data.childName.trim().length > 0 ? undefined : "Please enter your child's name.";
    case "ageOrYear":
      return data.ageOrYear ? undefined : "Please select an age or year group.";
    case "timeline":
      return data.timeline ? undefined : "Please select a timeline.";
    case "budget":
      return data.budget ? undefined : "Please select a budget range.";
    case "impetus":
      return data.impetus ? undefined : "Please select a reason.";
    case "curriculum":
      return data.curriculum ? undefined : "Please select a curriculum.";
  }
}

const SELECTS: { field: RequiredField; label: string; options: string[] }[] = [
  { field: "ageOrYear", label: "Child's age or year group", options: ageOptions },
  { field: "timeline", label: "When does your child need to start?", options: timelineOptions },
  { field: "budget", label: "What is your budget range per year?", options: budgetOptions },
  { field: "impetus", label: "Why are you looking for a new school?", options: impetusOptions },
  { field: "curriculum", label: "Current school type or curriculum", options: curriculumOptions },
];

export function IntakeFormClient({ formId }: { formId: string }) {
  const router = useRouter();
  const [data, setData] = useState<IntakeFormData>(INITIAL_DATA);
  const [touched, setTouched] = useState<Partial<Record<RequiredField, boolean>>>({});
  const [showOptional, setShowOptional] = useState(false);

  const update = <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const errorFor = (field: RequiredField) =>
    touched[field] ? validateField(field, data) : undefined;

  const isFormValid = REQUIRED_FIELDS.every((field) => validateField(field, data) === undefined);

  const handleSubmit = () => {
    setTouched(
      REQUIRED_FIELDS.reduce(
        (acc, field) => ({ ...acc, [field]: true }),
        {} as Partial<Record<RequiredField, boolean>>,
      ),
    );
  };

  return (
    <div className="w-full py-lw-2xl">
      <div className={CARD_WRAPPER}>
        <ProgressStepper steps={INTAKE_FLOW_STEPS} currentStep={0} />

        <div className="mb-lw-lg rounded-lw-lg border-l-[3px] border-lw-warning bg-lw-bg-subtle px-lw-base py-lw-md text-[13px] leading-relaxed text-lw-text">
          Preview of form <span className="font-mono">{formId}</span>. Submissions are not stored —
          the form intake path lands with ADR-0010&apos;s v2 work.
        </div>

        <div className="mb-lw-base pb-lw-md text-lg font-semibold text-lw-text">About you</div>

        <div className="grid grid-cols-2 gap-lw-base max-[560px]:grid-cols-1">
          <FormField label="Your name" required error={errorFor("name")}>
            <input
              type="text"
              className={`${INPUT} ${errorFor("name") ? INPUT_ERROR : ""}`}
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            />
          </FormField>
          <FormField label="Your email" required error={errorFor("email")}>
            <input
              type="email"
              className={`${INPUT} ${errorFor("email") ? INPUT_ERROR : ""}`}
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            />
          </FormField>
        </div>

        <FormField label="Your phone (optional)">
          <input
            type="tel"
            className={INPUT}
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </FormField>

        <FormField label="Child's first name" required error={errorFor("childName")}>
          <input
            type="text"
            className={`${INPUT} ${errorFor("childName") ? INPUT_ERROR : ""}`}
            value={data.childName}
            onChange={(e) => update("childName", e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, childName: true }))}
          />
        </FormField>

        <div className="mt-lw-sm mb-lw-base border-t border-lw-border-subtle pt-lw-lg text-lg font-semibold text-lw-text">
          About your search
        </div>

        {SELECTS.map(({ field, label, options }) => (
          <FormField key={field} label={label} required error={errorFor(field)}>
            <select
              className={`${SELECT} ${errorFor(field) ? INPUT_ERROR : ""}`}
              value={data[field]}
              onChange={(e) => update(field, e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, [field]: true }))}
            >
              <option value="" disabled>
                Select an option
              </option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        ))}

        {data.impetus === "Other" && (
          <FormField label="Tell us more">
            <textarea
              className={TEXTAREA}
              rows={3}
              value={data.impetusOther}
              onChange={(e) => update("impetusOther", e.target.value)}
            />
          </FormField>
        )}

        <button
          type="button"
          className={LINK_BTN}
          aria-expanded={showOptional}
          onClick={() => setShowOptional((prev) => !prev)}
        >
          Add more details (optional)
          <span className={`flex transition-transform ${showOptional ? "rotate-180" : ""}`}>
            <ChevronDown size={16} />
          </span>
        </button>

        {showOptional && (
          <div className="mt-lw-base">
            <FormField label="Boarding or day?">
              <ChipSelect
                options={boardingOptions}
                value={data.boarding}
                onChange={(value) => update("boarding", value)}
              />
            </FormField>

            <FormField label="Nationality / passports held">
              <TagInput
                values={data.nationalities}
                onChange={(values) => update("nationalities", values)}
                placeholder="Type and press Enter"
              />
            </FormField>

            <FormField label="Preferred regions or countries">
              <TagInput
                values={data.regions}
                onChange={(values) => update("regions", values)}
                placeholder="Type and press Enter"
              />
            </FormField>

            <FormField label="Learning differences or special needs?">
              <ChipSelect
                options={learningOptions}
                value={data.learning}
                onChange={(value) => update("learning", value)}
              />
            </FormField>

            <FormField label="Anything else we should know?">
              <textarea
                className={TEXTAREA}
                rows={3}
                value={data.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </FormField>
          </div>
        )}

        <button
          type="button"
          className={`${BTN_PRIMARY} mt-lw-sm w-full`}
          disabled={!isFormValid}
          onClick={handleSubmit}
        >
          Continue
          <ArrowRight size={16} />
        </button>

        <button
          type="button"
          className={LINK_BTN}
          onClick={() => router.push(`/admin/forms/${formId}/build`)}
        >
          Open in form builder
        </button>

        <div className={FOOTER_NOTE}>Powered by Lawrence</div>
      </div>
    </div>
  );
}
