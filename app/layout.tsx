import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Masal | Lead Intelligence",
  description: "An AI sales copilot for real-estate lead prioritization.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
