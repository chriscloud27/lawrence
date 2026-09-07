export const SITE_CONFIG = {
  // TODO: no GTM container provisioned yet for lawrence
  gtmId: "",
  // TODO: placeholder contact until a lawrence-domain inbox exists
  legalEmail: "chrisallin24@gmail.com",

  company: {
    name: "Lawrence",
    // TODO: no registered legal entity/address yet — prototype stage
    address: "",
    ein: "",
  },

  seo: {
    // TODO: replace with the real production domain once assigned
    siteUrl: "https://lawrence.example",

    // No named public spokesperson for lawrence — Person JSON-LD is
    // deliberately omitted in app/[locale]/page.tsx rather than emitted empty.
    person: {
      name: "",
      jobTitle: "",
      image: "",
      sameAs: [] as string[],
    },

    organization: {
      name: "Lawrence",
      url: "https://lawrence.example",
      // TODO: no logo asset in public/ yet
      logo: "",
      sameAs: [] as string[],
    },

    consent: {
      cookieName: "lawrence_consent",
      eventName: "lawrence_consent_update",
    },
  },
} as const;
