import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
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

// Applied before paint to avoid a light/dark flash. Light stays the default
// for users with no saved preference.
const themeScript = `try{var t=localStorage.getItem('masal-ai-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
