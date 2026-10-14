import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masal AI — Lead Intelligence",
  description: "A practical AI copilot for real-estate lead prioritization and sales follow-up."
};

// Applied before paint to avoid a light/dark flash. Light stays the default
// for users with no saved preference.
const themeScript = `try{var t=localStorage.getItem('masal-ai-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
