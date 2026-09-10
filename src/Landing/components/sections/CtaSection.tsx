import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function CtaSection() {
  const t = useTranslations("cta");

  return (
    <section className="bg-lw-bg-subtle py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg text-center">
        <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-lw-text">
          {t("heading")}
        </h2>
        <p className="mt-lw-base text-[16px] text-lw-text-secondary">{t("sub")}</p>
        <div className="mt-lw-2xl">
          <Button asChild size="lg">
            <a href="/en/contact">{t("ctaLabel")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
