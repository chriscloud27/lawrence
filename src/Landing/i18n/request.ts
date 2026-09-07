import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import React from "react";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to default locale if the resolved locale is not in the list
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    defaultTranslationValues: {
      highlight: (chunks: React.ReactNode) =>
        React.createElement("span", { className: "text-lw-accent" }, chunks),
      strong: (chunks: React.ReactNode) =>
        React.createElement(
          "strong",
          { className: "font-semibold text-lw-text" },
          chunks,
        ),
    },
  };
});
