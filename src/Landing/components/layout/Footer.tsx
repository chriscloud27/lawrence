import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-lw-border px-lw-lg py-lw-lg">
      <div className="mx-auto max-w-content">
        <div className="flex flex-col items-center justify-between gap-lw-lg sm:flex-row">
          <div className="flex items-center gap-[10px]">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-lw-accent text-[12px] font-bold text-lw-text-on-accent">
              L
            </div>
            <span className="text-[14px] font-medium text-lw-text">Lawrence</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-lw-base text-[14px] text-lw-text-secondary">
            <a href="#" className="hover:text-lw-text">Product</a>
            <span className="text-lw-border">·</span>
            <a href="#" className="hover:text-lw-text">Pricing</a>
            <span className="text-lw-border">·</span>
            <a href="#" className="hover:text-lw-text">Docs</a>
            <span className="text-lw-border">·</span>
            <a href="#" className="hover:text-lw-text">Contact</a>
          </nav>

          <p className="text-[14px] text-lw-text-secondary">
            {t("copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
