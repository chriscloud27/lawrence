import { useTranslations } from "next-intl";

export default function StatsSection() {
  const t = useTranslations("stats");

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <section className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <h2 className="text-center text-[28px] font-bold leading-[1.2] tracking-[-0.5px] text-lw-text">
          {t("title")}
        </h2>
        <p className="mx-auto mt-lw-base max-w-lead text-center text-[16px] text-lw-text-secondary">
          {t("context")}
        </p>

        <dl className="mt-lw-xl grid grid-cols-1 gap-lw-lg sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lw-lg border border-lw-border bg-lw-bg-card p-lw-lg text-center"
            >
              <dt className="font-mono text-[40px] font-bold tracking-[-0.5px] text-lw-text">
                {stat.value}
              </dt>
              <dd className="mt-lw-sm max-w-[160px] mx-auto text-[14px] text-lw-text-secondary">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
