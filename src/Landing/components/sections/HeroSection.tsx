import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <div className="flex flex-col items-center gap-lw-2xl lg:flex-row lg:items-center">
          <div className="max-w-text lg:flex-1">
            <span className="text-[18px] font-bold text-lw-accent">
              {t("eyebrow")}
            </span>
            <h1 className="hero-sub mt-lw-base text-[36px] font-bold leading-[1.1] tracking-[-1.5px] text-lw-text">
              {t("h1Part1")} <br /> 
              <span className="text-lw-accent">{t("h1Emphasis")}</span>
            </h1>
            <p className="mt-lw-base max-w-lead text-[18px] leading-[1.5] text-lw-text-secondary">
              {t("sub")}
            </p>

            <div className="mt-lw-xl flex flex-wrap items-center gap-lw-base">
              <Button size="lg">{t("cta")}</Button>
              <a
                href="#how-it-works"
                className="text-[14px] font-semibold text-lw-accent hover:text-lw-accent-hover"
              >
                {t("ctaSecondary")}
              </a>
            </div>
          </div>

          <div className="relative w-full max-w-[340px] shrink-0 overflow-hidden rounded-lw-lg border border-lw-border shadow-lw-lg aspect-video">
            <Image
              src="/images/dashboard-preview.png"
              alt="Agency dashboard preview"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lw-accent">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-1 text-lw-text-on-accent"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
