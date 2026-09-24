import type { Metadata, Viewport } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-anton",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.nombre} — ${site.tagline}`,
    template: `%s — ${site.nombre}`,
  },
  description: site.descripcion,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: site.nombre,
    title: `${site.nombre} — ${site.tagline}`,
    description: site.descripcion,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.nombre} — ${site.tagline}`,
    description: site.descripcion,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${anton.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
