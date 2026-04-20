import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const getApiOrigin = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "";
  try {
    if (envUrl) {
      return new URL(envUrl).origin;
    }
  } catch {
    return envUrl.replace(/\/$/, "");
  }
  return "";
};

const apiOrigin = getApiOrigin();
const vercelDomains = ["https://vercel.live", "https://vercel.com"];

const connectSrc = [
  "'self'",
  apiOrigin,
  ...(isDev
    ? ["ws://localhost:*", "http://localhost:*", "http://127.0.0.1:*"]
    : []),
  ...vercelDomains,
].filter(Boolean);

const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://vercel.live",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "data:", "blob:", "https://vercel.com"],
  "connect-src": connectSrc,
  "frame-src": ["'self'", "https://vercel.live"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "upgrade-insecure-requests": isDev ? [] : [""],
};

const csp = Object.entries(cspDirectives)
  .map(([key, values]) =>
    values.length === 0 ? "" : `${key} ${values.join(" ")}`,
  )
  .filter(Boolean)
  .join("; ");

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
      "interest-cohort=()",
      "browsing-topics=()",
    ].join(", "),
  },
  { key: "Content-Security-Policy", value: csp },
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
  ],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
