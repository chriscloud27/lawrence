"use client";

import { useTranslations } from "next-intl";
import CtaForm from "@/components/sections/CtaForm";

export default function ContactPage() {
  const t = useTranslations("contact");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-content px-lw-lg py-lw-2xl md:py-lw-section">
        <div className="text-center">
          <h1 className="text-[32px] font-bold leading-[1.2] tracking-[-0.5px] text-lw-text">
            {t("heading")}
          </h1>
          <p className="mt-lw-base text-[16px] text-lw-text-secondary">
            {t("sub")}
          </p>
        </div>
        <div className="mx-auto mt-lw-2xl max-w-lg rounded-lw-lg border border-lw-border bg-lw-bg p-lw-lg shadow-lw-md">
          <CtaForm />
        </div>
      </div>
    </main>
  );
}
