"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function HeroSection() {
  const t = useTranslations("hero");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <section className="bg-lw-bg py-lw-2xl md:py-lw-section">
      <div className="mx-auto max-w-content px-lw-lg">
        <div className="flex flex-col items-center gap-lw-2xl lg:flex-row lg:items-center">
          <div className="max-w-text lg:flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-lw-accent-subtle px-3.5 py-1.5 mb-lw-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-lw-accent animate-pulse-badge"></span>
              <span className="text-[12px] font-medium text-lw-accent">
                {t("eyebrow")}
              </span>
            </div>
            <h1 className="hero-sub text-[36px] font-bold leading-[1.1] tracking-[-1.5px] text-lw-text">
              {t("h1Part1")} <br />
              <span className="text-lw-accent">{t("h1Emphasis")}</span>
            </h1>
            <p className="mt-lw-base max-w-lead text-[18px] leading-[1.5] text-lw-text-secondary">
              {t("sub")}
            </p>

            <div className="mt-lw-xl flex flex-wrap items-center gap-lw-base">
              <Button size="default" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {t("cta")}
              </Button>
              <Button variant="outline" size="default" className="flex items-center gap-2">
                {t("ctaSecondary")}
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-lw-xl flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full bg-lw-accent flex items-center justify-center border-2 border-lw-bg text-[10px] font-bold text-lw-text-on-accent">
                  AH
                </div>
                <div className="h-7 w-7 rounded-full bg-lw-bg-elevated flex items-center justify-center border-2 border-lw-bg text-[10px] font-bold text-lw-text">
                  KW
                </div>
                <div className="h-7 w-7 rounded-full bg-lw-border flex items-center justify-center border-2 border-lw-bg text-[10px] font-bold text-lw-text">
                  TS
                </div>
                <div className="h-7 w-7 rounded-full bg-lw-text-secondary flex items-center justify-center border-2 border-lw-bg text-[10px] font-bold text-lw-text-on-accent">
                  RM
                </div>
              </div>
              <p className="text-[12px] text-lw-text-muted">
                Trusted by <span className="font-semibold text-lw-text-secondary">{t("trustedCount")}</span>
              </p>
            </div>
          </div>

          {isPlaying ? (
            <div className="relative w-full max-w-[600px] shrink-0 aspect-video">
              <video
                autoPlay
                controls
                className="h-full w-full rounded-lw-lg border border-lw-border shadow-lw-lg"
                onEnded={() => setIsPlaying(false)}
              >
                <source src="/videos/hero-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div
              className={`relative w-full max-w-[600px] shrink-0 overflow-hidden rounded-lw-lg border border-lw-border aspect-video transition-all duration-300 cursor-pointer shadow-lw-lg ${
                isHovering
                  ? "shadow-2xl scale-105 z-10"
                  : ""
              }`}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => setIsPlaying(true)}
            >
              <Image
                src="/images/dashboard-preview.png"
                alt="Agency dashboard preview"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-lw-accent transition-all duration-300 ${
                  isHovering ? "scale-110" : "scale-100"
                }`}>
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
          )}
        </div>
      </div>
    </section>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
