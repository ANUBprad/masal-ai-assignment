import type { Metadata } from "next";

// The dashboard is the working app view. Its HTML is an empty shell — all lead
// data lives in the visitor's browser — but it is still an application screen
// rather than a marketing page, so it is kept out of the index.
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Masal AI lead workspace. Add a lead to see its priority score, AI analysis, call brief, and sales copilot.",
  robots: { index: false, follow: true }
};

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
