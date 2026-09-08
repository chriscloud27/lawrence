import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import HeroSection from "@/components/sections/HeroSection";
import StatsSection from "@/components/sections/StatsSection";
import ServicesSection from "@/components/sections/ServicesSection";
import CtaSection from "@/components/sections/CtaSection";
import { getGlobalSettings } from "@/lib/settings";
import { buildCanonical, buildCanonicalAndAlternates } from "@/lib/seo";
import { HOME_KEYWORDS } from "@/lib/keywords";
import { SITE_CONFIG } from "@/lib/site-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = getGlobalSettings(locale);
  const i18n = buildCanonicalAndAlternates("/", locale);
  const ogImage = settings.defaultSeo?.shareImage;

  return {
    title: settings.defaultSeo?.metaTitle ?? settings.siteName,
    description:
      settings.defaultSeo?.metaDescription ?? settings.siteDescription,
    keywords: HOME_KEYWORDS,
    openGraph: {
      type: "website",
      url: buildCanonical(`/${locale}`),
      title: settings.defaultSeo?.metaTitle ?? settings.siteName,
      description:
        settings.defaultSeo?.metaDescription ?? settings.siteDescription,
      images: ogImage
        ? [
            {
              url: ogImage.url,
              width: ogImage.width,
              height: ogImage.height,
              alt: ogImage.alternativeText ?? settings.siteName,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.defaultSeo?.metaTitle ?? settings.siteName,
      description:
        settings.defaultSeo?.metaDescription ?? settings.siteDescription,
      images: ogImage ? [ogImage.url] : undefined,
    },
    ...i18n,
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { organization, siteUrl } = SITE_CONFIG.seo;
  const pageUrl = buildCanonical(`/${locale}`);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization.name,
    url: organization.url,
    description:
      "Lawrence turns every parent enquiry into a scored, profiled lead before a counsellor picks up the phone — so education agencies sell placements instead of running intake calls.",
    sameAs: organization.sameAs,
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lawrence — AI Admissions Intake for Education Agencies",
    url: pageUrl,
    description:
      "Lawrence qualifies parent leads via BANT scoring and routes them to the right counsellor automatically, replacing manual discovery calls with an AI-driven intake that builds a parent profile before a human is involved.",
    datePublished: "2026-09-01",
    dateModified: "2026-09-07",
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: organization.name,
      url: organization.url,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".hero-sub"],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is BANT scoring?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "BANT is a Budget, Authority, Need, and Timeline scoring framework. Lawrence scores every parent profile 0–100 across these four dimensions and routes the lead automatically — under 35 to automated resources, 35–50 for AI follow-up questions, 50–75 to a booking link and counsellor introduction, and 75+ as a priority hot-lead alert.",
        },
      },
      {
        "@type": "Question",
        name: "How does Lawrence route leads to counsellors?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Lawrence builds a structured parent profile from intake forms and any documents, voice notes, or PDFs a parent shares, scores it with BANT, and hands qualified leads to counsellors with a pre-built profile instead of a blank contact form.",
        },
      },
      {
        "@type": "Question",
        name: "Who is Lawrence for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Education agencies and admissions consultancies that receive parent enquiries for school or university placements and want to stop spending counsellor time on manual discovery calls and unqualified leads.",
        },
      },
    ],
  };

  const definedTermSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: "BANT Scoring",
    alternateName: "Budget, Authority, Need, Timeline",
    description:
      "The qualification framework Lawrence uses to score parent leads 0–100 across Budget, Authority, Need, and Timeline signals, determining routing to automated resources, AI follow-up, or a counsellor.",
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Lawrence Admissions Intake Glossary",
      url: siteUrl,
    },
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteUrl,
    name: organization.name,
    hasPart: [
      {
        "@type": "SiteNavigationElement",
        name: "Home",
        description:
          "Lawrence: AI-driven admissions intake and BANT lead qualification for education agencies.",
        url: pageUrl,
        position: 1,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSchema) }}
      />
      <main>
        <HeroSection />
        <StatsSection />
        <ServicesSection />
        <CtaSection />
      </main>
    </>
  );
}
