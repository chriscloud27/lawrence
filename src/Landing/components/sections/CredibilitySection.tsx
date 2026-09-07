import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export default function CredibilitySection() {
  const t = useTranslations("credibility");

  const mechanisms = [
    { title: t("mechanism1Title"), desc: t("mechanism1Desc") },
    { title: t("mechanism2Title"), desc: t("mechanism2Desc") },
    { title: t("mechanism3Title"), desc: t("mechanism3Desc") },
  ];

  return (
    <section id="credibility" className="bg-lw-bg py-lw-2xl md:py-lw-section">
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

        <div className="mt-lw-xl grid grid-cols-1 gap-lw-2xl md:grid-cols-[1fr_auto]">
          <div className="space-y-lw-lg">
            {mechanisms.map((m) => (
              <div key={m.title}>
                <h3 className="text-[18px] font-semibold text-lw-text">{m.title}</h3>
                <p className="mt-lw-xs max-w-text text-[14px] leading-[1.5] text-lw-text-secondary">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="h-fit w-full max-w-[280px] rounded-lw-lg border border-lw-border bg-lw-bg-card p-lw-lg shadow-lw-md">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-lw-text-secondary">
                {t("mockScoreLabel")}
              </span>
              <span className="font-mono text-[22px] font-bold text-lw-accent">
                {t("mockScoreValue")}
              </span>
            </div>
            <div className="mt-lw-base flex flex-wrap gap-lw-sm">
              <Badge>{t("mockFilter1")}</Badge>
              <Badge>{t("mockFilter2")}</Badge>
              <Badge variant="accent">{t("mockFilter3")}</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
