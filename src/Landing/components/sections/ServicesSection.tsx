import { useTranslations } from "next-intl";
import {
  MessageCircle,
  Sparkles,
  CheckCircle,
  FileText,
} from "lucide-react";

export default function ServicesSection() {
  const t = useTranslations("services");

  const steps = [
    { label: t("step1Label"), desc: t("step1Desc"), icon: MessageCircle },
    { label: t("step2Label"), desc: t("step2Desc"), icon: Sparkles },
    { label: t("step3Label"), desc: t("step3Desc"), icon: CheckCircle },
    { label: t("step4Label"), desc: t("step4Desc"), icon: FileText },
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

        {/* Desktop Grid with Connectors */}
        <div className="mt-lw-xl hidden md:block">
          <div className="relative">
            {/* Connecting line (desktop only) */}
            <div className="absolute left-0 top-12 h-0.5 w-full bg-lw-border" />

            <div className="relative grid grid-cols-4 gap-lw-lg">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex flex-col">
                    {/* Step number circle */}
                    <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-lw-bg border-4 border-lw-accent">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lw-text-muted text-[12px] font-semibold uppercase tracking-wide">
                          Step
                        </span>
                        <span className="text-lw-accent font-bold text-[24px]">
                          {index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Icon and content card */}
                    <div className="mt-lw-lg rounded-lw-lg border border-lw-border bg-lw-bg-card p-lw-lg">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lw-accent-subtle">
                        <Icon className="h-6 w-6 text-lw-accent" />
                      </div>
                      <h3 className="mt-lw-base text-[16px] font-semibold leading-tight text-lw-text">
                        {step.label}
                      </h3>
                      <p className="mt-lw-xs text-[13px] leading-[1.5] text-lw-text-secondary">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Stack */}
        <div className="mt-lw-xl flex flex-col md:hidden">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex gap-lw-lg">
                {/* Step number circle */}
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-lw-accent text-lw-text-on-accent border-4 border-lw-accent">
                    <span className="font-bold text-[20px]">{index + 1}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="my-lw-sm h-12 w-0.5 bg-lw-border" />
                  )}
                </div>

                {/* Content card */}
                <div className="pb-lw-lg flex-1 pt-lw-xs">
                  <div className="rounded-lw-lg border border-lw-border bg-lw-bg-card p-lw-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lw-accent-subtle">
                      <Icon className="h-5 w-5 text-lw-accent" />
                    </div>
                    <h3 className="mt-lw-base text-[16px] font-semibold text-lw-text">
                      {step.label}
                    </h3>
                    <p className="mt-lw-xs text-[13px] leading-[1.5] text-lw-text-secondary">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
