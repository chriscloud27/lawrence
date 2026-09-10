import { useTranslations } from "next-intl";
import { MessageCircle, Sparkles, CalendarCheck } from "lucide-react";

export default function ServicesSection() {
  const t = useTranslations("services");

  const steps = [
    { label: t("step1Label"), desc: t("step1Desc"), icon: MessageCircle },
    { label: t("step2Label"), desc: t("step2Desc"), icon: Sparkles },
    { label: t("step3Label"), desc: t("step3Desc"), icon: CalendarCheck },
    { label: t("step4Label"), desc: t("step4Desc"), icon: CalendarCheck },
  ];

  return (
    <section id="how-it-works" className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <h2 className="text-center text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-lw-text">
          {t("heading")}
        </h2>
        <p className="mx-auto mt-lw-sm max-w-lead text-center text-[16px] text-lw-text-secondary">
          {t("sub")}
        </p>
        <div className="mt-lw-xl grid grid-cols-1 gap-lw-lg md:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="rounded-lw-lg border border-lw-border bg-lw-bg-card p-lw-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lw-accent-subtle">
                  <Icon className="h-6 w-6 text-lw-accent" />
                </div>
                <h3 className="mt-lw-base text-[18px] font-semibold text-lw-text">
                  {step.label}
                </h3>
                <p className="mt-lw-xs text-[14px] leading-[1.5] text-lw-text-secondary">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
