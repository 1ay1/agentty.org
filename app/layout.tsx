import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "agentty — blazing-fast Claude in your terminal",
    template: "%s · agentty",
  },
  description: site.description,
  keywords: [
    "agentty", "claude code", "terminal AI", "coding agent", "C++26",
    "claude cli", "ai coding", "static binary", "sandboxed agent",
  ],
  authors: [{ name: "agentty contributors" }],
  openGraph: {
    type: "website",
    url: site.url,
    title: "agentty — blazing-fast Claude in your terminal",
    description: site.description,
    siteName: "agentty",
  },
  twitter: {
    card: "summary_large_image",
    title: "agentty — blazing-fast Claude in your terminal",
    description: site.description,
  },
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "agentty",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Linux, macOS, Windows",
  description: site.description,
  url: site.url,
  license: "https://opensource.org/licenses/MIT",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  softwareVersion: "0.1.0",
  programmingLanguage: "C++",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
