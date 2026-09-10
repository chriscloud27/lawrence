import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { SITE_CONFIG } from "@/lib/site-config";

export default function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-50 border-b border-lw-border bg-lw-bg">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-lw-lg">
        <Link href="/" className="flex items-center gap-[10px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lw bg-lw-accent text-[13px] font-bold text-lw-text-on-accent">
            L
          </div>
          <span className="text-[16px] font-bold tracking-[-0.4px] text-lw-text">
            Lawrence
          </span>
        </Link>

        <nav className="hidden items-center gap-lw-lg md:flex">
          <a href="#" className="text-[14px] font-medium text-lw-text-secondary hover:text-lw-text">
            {t("product")}
          </a>
          <a href="#" className="text-[14px] font-medium text-lw-text-secondary hover:text-lw-text">
            {t("pricing")}
          </a>
          <a href="#" className="text-[14px] font-medium text-lw-text-secondary hover:text-lw-text">
            {t("docs")}
          </a>
          <a href="/en/contact" className="text-[14px] font-medium text-lw-text-secondary hover:text-lw-text">
            {t("contact")}
          </a>
        </nav>

        <div className="flex items-center gap-lw-sm">
          <ThemeToggle />
          <a
            href={SITE_CONFIG.appUrl}
            className="hidden text-[14px] font-medium text-lw-text-secondary hover:text-lw-text sm:inline"
          >
            {t("login")}
          </a>
          <Button asChild size="sm">
            <a href={SITE_CONFIG.appUrl}>{t("getStarted")}</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
