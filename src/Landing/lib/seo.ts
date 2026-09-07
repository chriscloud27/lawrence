import { SITE_CONFIG } from "@/lib/site-config";

export function buildCanonical(path: string): string {
  const base = SITE_CONFIG.seo.siteUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export function buildCanonicalAndAlternates(path: string, locale: string) {
  const suffix = path === "/" ? "" : path;
  return {
    alternates: {
      canonical: buildCanonical(`/${locale}${suffix}`),
      // Single-locale site today; extend when a second locale ships.
      languages: {
        en: buildCanonical(`/en${suffix}`),
      },
    },
  };
}
