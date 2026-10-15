import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { DEFAULT_THEME, THEME_ATTRIBUTE, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

// Self-hosted at build time: no render-blocking third-party CSS request and no
// external font origins (see the CSP in next.config.ts).
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { default: "Masal AI — Real-estate Lead Intelligence", template: "%s · Masal AI" },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Masal AI — Real-estate Lead Intelligence",
    description: SITE_DESCRIPTION,
    url: SITE_URL
  },
  twitter: {
    card: "summary_large_image",
    title: "Masal AI — Real-estate Lead Intelligence",
    description: SITE_DESCRIPTION
  },
  robots: { index: true, follow: true }
};

// Tints the mobile browser chrome to match whichever theme is active.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f3f3ee" }
  ]
};

// Runs before first paint so the correct theme is applied with no flash, and
// marks the document as script-enabled (`.js`) so the landing page's scroll
// reveal can start hidden without ever hiding content when JavaScript is off.
// The storage key and attribute must match lib/theme.ts and the client toggle;
// the inline script is allowed by the CSP's script-src 'unsafe-inline'.
const themeScript = `(function(){var d=document.documentElement;d.classList.add("js");try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=(s==="light"||s==="dark")?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");d.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t);}catch(e){d.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},${JSON.stringify(DEFAULT_THEME)});}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${manrope.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
