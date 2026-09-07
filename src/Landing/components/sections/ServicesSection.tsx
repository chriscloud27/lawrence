import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export default function ServicesSection() {
  const t = useTranslations("services");

  const steps = [
    { label: t("step1Label"), desc: t("step1Desc") },
    { label: t("step2Label"), desc: t("step2Desc") },
    { label: t("step3Label"), desc: t("step3Desc") },
    { label: t("step4Label"), desc: t("step4Desc") },
    { label: t("step5Label"), desc: t("step5Desc") },
    { label: t("step6Label"), desc: t("step6Desc") },
  ];

  const bands = [t("step5Band1"), t("step5Band2"), t("step5Band3"), t("step5Band4")];

  return (
    <section className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <span className="font-mono text-[13px] uppercase tracking-[.04em] text-lw-text-muted">
          {t("eyebrow")}
        </span>
        <h2 className="mt-lw-base max-w-lead text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-lw-text">
          {t("heading")}
        </h2>
        <p className="mt-lw-sm max-w-lead text-[16px] text-lw-text-secondary">
          {t("sub")}
        </p>
        <ol className="mt-lw-xl space-y-lw-lg">
          {steps.map((step, i) => (
            <li key={step.label} className="flex gap-lw-base border-l-2 border-lw-border pl-lw-lg">
              <span className="flex h-lw-xl w-lw-xl shrink-0 -translate-x-1/2 items-center justify-center rounded-full bg-lw-accent-subtle font-mono text-[13px] font-semibold text-lw-accent">
                {i + 1}
              </span>
              <div className="-ml-lw-lg">
                <h3 className="text-[18px] font-semibold text-lw-text">{step.label}</h3>
                <p className="mt-lw-xs text-[14px] leading-[1.5] text-lw-text-secondary">
                  {step.desc}
                </p>
                {i === 4 && (
                  <ul className="mt-lw-sm flex flex-wrap gap-lw-sm">
                    {bands.map((band) => (
                      <li key={band}>
                        <Badge variant="accent">{band}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
