import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only pages intended to be public are listed. The landing page and the static
// legal pages are indexable; the dashboard is an application screen (noindexed
// in app/dashboard/layout.tsx) and API routes are excluded, so neither appears.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 }
  ];
}
