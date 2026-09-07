import { useTranslations } from "next-intl";

export default function ProblemSection() {
  const t = useTranslations("problem");

  const points = [
    { value: t("point1Value"), title: t("point1Title"), desc: t("point1Desc") },
    { value: t("point2Value"), title: t("point2Title"), desc: t("point2Desc") },
    { value: t("point3Value"), title: t("point3Title"), desc: t("point3Desc") },
  ];

  return (
    <section className="bg-lw-bg-subtle py-lw-2xl md:py-lw-section">
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
        <div className="mt-lw-xl grid grid-cols-1 gap-lw-lg md:grid-cols-3">
          {points.map((point) => (
            <div
              key={point.title}
              className="rounded-lw-lg border border-lw-border-subtle bg-lw-bg-card p-lw-lg"
            >
              <div className="font-mono text-[32px] font-bold text-lw-accent">
                {point.value}
              </div>
              <h3 className="mt-lw-sm text-[18px] font-semibold text-lw-text">
                {point.title}
              </h3>
              <p className="mt-lw-xs text-[14px] leading-[1.5] text-lw-text-secondary">
                {point.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
