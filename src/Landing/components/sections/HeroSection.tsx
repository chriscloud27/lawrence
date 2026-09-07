import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const t = useTranslations("hero");

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  const chips = [t("chip1"), t("chip2"), t("chip3"), t("chip4")];

  return (
    <section className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <div className="flex flex-col items-center gap-lw-2xl lg:flex-row lg:items-center">
          <div className="max-w-text lg:flex-1">
            <span className="font-mono text-[13px] uppercase tracking-[.04em] text-lw-text-muted">
              {t("eyebrow")}
            </span>
            <h1 className="hero-sub mt-lw-base text-[36px] font-bold leading-[1.1] tracking-[-1.5px] text-lw-text">
              {t("h1Part1")} <span className="text-lw-accent">{t("h1Emphasis")}</span>
            </h1>
            <p className="mt-lw-base max-w-lead text-[18px] leading-[1.5] text-lw-text-secondary">
              {t("sub")}
            </p>

            <div className="mt-lw-lg flex flex-wrap gap-lw-sm">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-[6px] rounded-full bg-lw-bg-card px-lw-sm py-[6px] text-[12px] font-medium text-lw-text-secondary"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-lw-accent"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-lw-xl flex flex-wrap items-center gap-lw-base">
              <Button size="lg">{t("cta")}</Button>
              <a
                href="#credibility"
                className="text-[14px] font-semibold text-lw-accent hover:text-lw-accent-hover"
              >
                {t("ctaSecondary")}
              </a>
            </div>
          </div>

          <div className="w-full max-w-[340px] shrink-0 overflow-hidden rounded-lw-lg border border-lw-border bg-lw-bg shadow-lw-lg">
            <div className="flex items-center gap-lw-sm bg-lw-accent px-lw-base py-lw-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lw-text-on-accent/15">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-lw-text-on-accent"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-[1.2] text-lw-text-on-accent">
                  {t("chatBotName")}
                </div>
                <div className="text-[11px] text-lw-text-on-accent/70">
                  {t("chatBotRole")}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-lw-sm bg-lw-bg-subtle p-lw-base">
              <div className="max-w-[85%] self-start rounded-lw-lg rounded-tl-[4px] bg-lw-bg px-[14px] py-[10px] text-[13px] leading-[1.5] text-lw-text shadow-lw-sm">
                {t("chatMsg1")}
              </div>
              <div className="max-w-[85%] self-end rounded-lw-lg rounded-tr-[4px] bg-lw-accent px-[14px] py-[10px] text-[13px] leading-[1.5] text-lw-text-on-accent">
                {t("chatMsg2")}
              </div>
              <div>
                <div className="max-w-[85%] self-start rounded-lw-lg rounded-tl-[4px] bg-lw-bg px-[14px] py-[10px] text-[13px] leading-[1.5] text-lw-text shadow-lw-sm">
                  {t("chatMsg3")}
                </div>
                <div className="mt-lw-xs flex items-center gap-[6px] pl-[4px]">
                  <span className="inline-flex items-center gap-[5px] rounded-full bg-lw-accent-subtle px-[10px] py-[3px] text-[12px] font-medium text-lw-accent">
                    <span className="h-[6px] w-[6px] rounded-full bg-lw-accent" />
                    {t("chatScoreLabel")}
                    <span className="font-mono text-[11px]">82/100</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-lw-border bg-lw-bg px-lw-sm py-[6px] text-center text-[10px] text-lw-text-muted">
              Powered by Lawrence
            </div>
          </div>
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
