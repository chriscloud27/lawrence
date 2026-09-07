export function getGlobalSettings(locale: string) {
  return {
    siteName: "Lawrence",
    siteDescription:
      "Lawrence turns every parent enquiry into a scored, profiled lead before a counsellor picks up the phone.",
    defaultSeo: {
      metaTitle: "Lawrence — AI Admissions Intake for Education Agencies",
      metaDescription:
        "Lawrence qualifies parent leads via BANT scoring and routes them to the right counsellor automatically — so agencies sell placements instead of running intake calls.",
      // No OG image asset exists in public/ yet.
      shareImage: undefined as
        | { url: string; width: number; height: number; alternativeText?: string }
        | undefined,
    },
  };
}
