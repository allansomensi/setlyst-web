import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * Vercel's preview toolbar (vercel.live) is injected into preview and
 * development deployments only — it is never part of a production page.
 * Allowing its origin to run scripts and frame the app in production
 * widens the policy for something that will never load there, so it is
 * gated on the deployment environment rather than on NODE_ENV (which is
 * "production" for preview builds too).
 */
const isProductionDeployment = process.env.VERCEL_ENV === "production";
const previewOrigins = isProductionDeployment
  ? []
  : ["https://vercel.live", "https://vercel.com"];

/** Vercel Web Analytics — loaded on every deployment, production included. */
const ANALYTICS_ORIGIN = "https://va.vercel-scripts.com";

const getApiOrigin = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
  try {
    if (envUrl) return new URL(envUrl).origin;
  } catch {
    return envUrl.replace(/\/$/, "");
  }
  return "";
};

const apiOrigin = getApiOrigin();

const connectSrc = [
  "'self'",
  apiOrigin,
  ...(isDev
    ? ["ws://localhost:*", "http://localhost:*", "http://127.0.0.1:*"]
    : []),
  ANALYTICS_ORIGIN,
  ...previewOrigins,
].filter(Boolean);

/**
 * Directives with no value (`upgrade-insecure-requests`) are listed here
 * separately from the source-list ones so they can be emitted bare — a
 * source-list directive with an empty value is treated as "block
 * everything", which is very much not what is meant.
 */
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    // Next.js inlines its bootstrap and route payloads as inline scripts.
    // Replacing this with a per-request nonce is the meaningful next step
    // for XSS hardening; it requires generating the nonce in proxy.ts and
    // opting every statically-rendered route out of that path.
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ANALYTICS_ORIGIN,
    ...previewOrigins,
  ],
  // No external stylesheet or font origins: next/font/google downloads and
  // self-hosts at build time, so nothing is ever fetched from Google at
  // runtime and allowing those origins only widens the policy.
  "style-src": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'"],
  "img-src": ["'self'", "data:", "blob:", ...previewOrigins],
  "connect-src": connectSrc,
  "frame-src": ["'self'", ...previewOrigins],
  "frame-ancestors": ["'none'"],
  "worker-src": ["'self'"],
  "manifest-src": ["'self'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
};

const valuelessDirectives = isDev ? [] : ["upgrade-insecure-requests"];

const csp = [
  ...Object.entries(cspDirectives)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => `${key} ${values.join(" ")}`),
  ...valuelessDirectives,
].join("; ");

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
  { key: "Content-Security-Policy", value: csp },
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
};

export default withNextIntl(nextConfig);
