import "./globals.css";
import type { ReactNode } from "react";

// Root layout — the <html> and <body> elements are provided by [locale]/layout.tsx
// to support per-locale lang attributes. This file is required by Next.js.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
