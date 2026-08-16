import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BANT Pre-Qualification Chat",
  description: "Prototype chat widget for the BANT pre-qualification flow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
