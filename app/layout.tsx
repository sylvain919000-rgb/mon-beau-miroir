import type { Metadata } from "next";
import "./globals.css";
import { copy } from "@/lib/copy";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  // Required so Next.js resolves relative paths (like /og-image.png) against your domain
  metadataBase: new URL("https://mon-beau-miroir.bereytapps.com/"),

  title: copy.appName, // or replace with a direct string e.g. "Mon Beau Miroir — Your Custom Title"
  description: copy.tagline, // or replace with your custom description string

  // Facebook, WhatsApp, Discord, LinkedIn Preview
  openGraph: {
    title: copy.appName,
    description: copy.tagline,
    url: "https://mon-beau-miroir.bereytapps.com/",
    siteName: copy.appName,
    images: [
      {
        url: "/og-image.png", // Image placed in public/og-image.png
        width: 1200,
        height: 630,
        alt: copy.appName,
      },
    ],
    type: "website",
  },

  // Twitter / X Preview Card
  twitter: {
    card: "summary_large_image",
    title: copy.appName,
    description: copy.tagline,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}