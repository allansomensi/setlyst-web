import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo";

/**
 * The public site is indexable; the signed-in app, the API routes and
 * personal links (unsubscribe, shared setlists and gigs) are not.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  // Only the production deployment is indexable
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/*/dashboard",
          "/*/unsubscribe",
          "/s/",
          "/g/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
