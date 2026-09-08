import { useTranslations } from "next-intl";
import CtaForm from "@/components/sections/CtaForm";

export default function CtaSection() {
  const t = useTranslations("cta");

  return (
    <section className="bg-lw-bg-subtle py-lw-2xl md:py-lw-section">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-lw-2xl px-lw-lg md:grid-cols-2">
        <div>
          <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-lw-text">
            {t("heading")}
          </h2>
          <p className="mt-lw-base text-[16px] text-lw-text-secondary">{t("sub")}</p>
        </div>
        <div className="rounded-lw-lg border border-lw-border bg-lw-bg p-lw-lg shadow-lw-md">
          <CtaForm />
        </div>
      </div>
    </section>
  );
}
