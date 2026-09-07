import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="bg-lw-footer-bg py-lw-lg text-center">
      <p className="text-[12px] text-lw-footer-text">
        Lawrence · {t("tagline")}
      </p>
      <p className="mt-lw-xs text-[12px] text-lw-footer-text">
        {t("poweredBy")} · {t("rights")}
      </p>
    </footer>
  );
}
