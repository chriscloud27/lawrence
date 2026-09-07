import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const t = useTranslations("hero");

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <section className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <span className="font-mono text-[13px] uppercase tracking-[.04em] text-lw-text-muted">
          {t("eyebrow")}
        </span>
        <h1 className="hero-sub mt-lw-base max-w-text text-[36px] font-bold leading-[1.1] tracking-[-1.5px] text-lw-text">
          {t("h1Part1")} <span className="text-lw-accent">{t("h1Emphasis")}</span>
        </h1>
        <p className="mt-lw-base max-w-lead text-[18px] leading-[1.5] text-lw-text-secondary">
          {t("sub")}
        </p>
        <div className="mt-lw-xl flex flex-wrap items-center gap-lw-base">
          <Button size="lg">{t("cta")}</Button>
          <a
            href="#credibility"
            className="text-[14px] font-semibold text-lw-accent hover:text-lw-accent-hover"
          >
            {t("ctaSecondary")}
          </a>
        </div>
        <dl className="mt-lw-2xl grid grid-cols-1 gap-lw-lg border-t border-lw-border pt-lw-xl sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-mono text-[28px] font-bold tracking-[-0.5px] text-lw-text">
                {stat.value}
              </dt>
              <dd className="mt-lw-xs text-[14px] text-lw-text-secondary">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
