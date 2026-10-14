import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masal AI — Lead Intelligence",
  description: "A practical AI copilot for real-estate lead prioritization and sales follow-up."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
