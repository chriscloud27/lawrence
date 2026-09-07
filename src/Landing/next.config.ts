import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";

const withNextIntl = createNextIntlPlugin();
const withMDX = createMDX({});

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "mach2.cloud" },
      { protocol: "https", hostname: "www.google.com" },
    ],
  },
};

export default withNextIntl(withMDX(nextConfig));
