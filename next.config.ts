import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { FALLBACK_CSP_SOURCES, buildCsp, cspEnvironment } from "./lib/csp";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * The static fallback policy, for the responses the middleware never
 * sees (FALLBACK_CSP_SOURCES: API routes, /_next assets, root static
 * files). Pages get a per-request nonce policy from proxy.ts instead; see
 * lib/csp.ts.
 */
const fallbackCsp = buildCsp(cspEnvironment());

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "wake-lock=(self)",
      "interest-cohort=()",
      "browsing-topics=()",
    ].join(", "),
  },
  // Severs the opener relationship with any window that launched this one,
  // so a page that opens the app can neither reach into it via
  // window.opener nor keep a handle on it after navigation.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // The app serves only its own assets; refusing to be loaded as a
  // subresource elsewhere closes off cross-origin leak techniques.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
    ...FALLBACK_CSP_SOURCES.map((source) => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: fallbackCsp }],
    })),
    {
      // The service worker file itself must never be served stale from the
      // browser's HTTP cache, or updates to the caching logic below would
      // never reach a client that's already installed an older version.
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
  images: { remotePatterns: [] },
  experimental: {
    // Barrel packages Next.js doesn't already optimize by default: only
    // the parts actually imported end up in the bundles.
    optimizePackageImports: [
      "radix-ui",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "sonner",
    ],
  },
};

export default withNextIntl(nextConfig);
