import { useTranslations } from "next-intl";
import { CheckCircle, X } from "lucide-react";

export default function OutcomesSection() {
  const t = useTranslations("outcomes");

  const stopItems = [t("stopItem1"), t("stopItem2"), t("stopItem3"), t("stopItem4")];
  const gainItems = [t("gainItem1"), t("gainItem2"), t("gainItem3"), t("gainItem4")];

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
        <div className="mt-lw-xl grid grid-cols-1 gap-lw-xl divide-y divide-lw-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="md:pr-lw-xl">
            <h3 className="text-[18px] font-semibold text-lw-text">{t("stopHeading")}</h3>
            <ul className="mt-lw-base space-y-lw-sm">
              {stopItems.map((item) => (
                <li key={item} className="flex items-start gap-lw-sm">
                  <X className="mt-[2px] h-5 w-5 shrink-0 text-lw-text-muted" strokeWidth={1.75} />
                  <span className="text-[14px] text-lw-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-lw-xl md:pl-lw-xl md:pt-0">
            <h3 className="text-[18px] font-semibold text-lw-text">{t("gainHeading")}</h3>
            <ul className="mt-lw-base space-y-lw-sm">
              {gainItems.map((item) => (
                <li key={item} className="flex items-start gap-lw-sm">
                  <CheckCircle className="mt-[2px] h-5 w-5 shrink-0 text-lw-accent" strokeWidth={1.75} />
                  <span className="text-[14px] text-lw-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
