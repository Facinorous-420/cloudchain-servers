export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { prisma } from "@/lib/prisma";
import {
  mergeColors,
  DEFAULT_PORT_TYPE_COLORS,
  DEFAULT_CATEGORY_COLORS,
} from "@/lib/diagram-settings";
import "./globals.css";

const lato = Lato({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  return {
    title: settings?.appName ?? "Cloudchain Inventory",
    description:
      settings?.appDescription ??
      "Homelab server rack inventory and documentation",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

  // Build a flat map of CSS variable overrides to inject on the <html> element.
  // Any null/default values are left out so the @theme defaults take effect.
  const portColors = mergeColors(settings?.portTypeColors, DEFAULT_PORT_TYPE_COLORS);
  const catColors  = mergeColors(settings?.categoryColors, DEFAULT_CATEGORY_COLORS);

  const cssVars: Record<string, string> = {
    "--color-accent": settings?.accentColor ?? "#00a8c6",
  };
  for (const [k, v] of Object.entries(portColors)) {
    cssVars[`--color-${k}`] = v;
  }
  for (const [k, v] of Object.entries(catColors)) {
    cssVars[`--color-${k}`] = v;
  }

  return (
    <html
      lang="en"
      className={lato.variable}
      style={cssVars as React.CSSProperties}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
