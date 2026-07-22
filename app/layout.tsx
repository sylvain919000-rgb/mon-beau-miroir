import type { Metadata } from "next";
import "./globals.css";
import { copy } from "@/lib/copy";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: copy.appName,
  description: copy.tagline,
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
