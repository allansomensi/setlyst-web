/**
 * The Content-Security-Policy of the app, in one place for proxy.ts (the
 * per-request nonce policy of every page) and next.config.ts (the static
 * fallback for what the middleware never sees: API routes, `/_next`
 * assets and root static files).
 *
 * Relative imports only: next.config.ts loads this file outside the
 * bundler, where the `@/` alias doesn't exist.
 */

export interface CspEnvironment {
  /** `next dev`: allows eval (React refresh) and the dev server sockets. */
  isDev: boolean;
  /**
   * A production Vercel deployment (VERCEL_ENV=production). Preview and
   * development deployments also allow the Vercel toolbar (vercel.live).
   */
  isProductionDeployment: boolean;
  /**
   * The app is served over plain http (a local `next start`, judged from
   * NEXTAUTH_URL). `upgrade-insecure-requests` would then rewrite every
   * same-origin request to https and break the page, so it is left out.
   */
  isPlainHttp?: boolean;
}

/** Vercel Web Analytics, loaded on every deployment. */
export const ANALYTICS_ORIGIN = "https://va.vercel-scripts.com";

export function cspEnvironment(
  env: Record<string, string | undefined> = process.env,
): CspEnvironment {
  return {
    isDev: env.NODE_ENV !== "production",
    isProductionDeployment: env.VERCEL_ENV === "production",
    isPlainHttp: (env.NEXTAUTH_URL ?? "").startsWith("http://"),
  };
}

/** A fresh, unguessable nonce (128 bits, base64). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Only base64 characters: a nonce can't smuggle in another directive. */
const NONCE_RE = /^[A-Za-z0-9+/_-]{16,64}={0,2}$/;

/**
 * The policy. With a `nonce`, scripts run only when they carry it (Next.js
 * adds it to its own scripts; `'strict-dynamic'` extends the trust to the
 * chunks they load). Without one (the static fallback), only same-origin
 * script files run: no inline script at all.
 */
export function buildCsp(env: CspEnvironment, nonce?: string): string {
  if (nonce !== undefined && !NONCE_RE.test(nonce)) {
    throw new Error("Invalid CSP nonce");
  }
  const previewOrigins = env.isProductionDeployment
    ? []
    : ["https://vercel.live", "https://vercel.com"];

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        ...(nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : []),
        ...(env.isDev ? ["'unsafe-eval'"] : []),
        ANALYTICS_ORIGIN,
        ...previewOrigins,
      ],
    ],
    // Inline styles stay allowed: Radix, recharts and dnd-kit position
    // elements with style attributes. next/font self-hosts the fonts, so
    // no external stylesheet or font origin is needed.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["font-src", ["'self'"]],
    ["img-src", ["'self'", "data:", "blob:", ...previewOrigins]],
    // The browser only talks to this origin: API calls go through server
    // actions and the /api/* route handlers.
    [
      "connect-src",
      [
        "'self'",
        ...(env.isDev
          ? ["ws://localhost:*", "http://localhost:*", "http://127.0.0.1:*"]
          : []),
        ANALYTICS_ORIGIN,
        ...previewOrigins,
      ],
    ],
    ["frame-src", ["'self'", ...previewOrigins]],
    ["frame-ancestors", ["'none'"]],
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["object-src", ["'none'"]],
  ];

  // Valueless directives are emitted bare: a source-list directive with an
  // empty value would mean "block everything".
  const valueless =
    env.isDev || env.isPlainHttp ? [] : ["upgrade-insecure-requests"];

  return [
    ...directives.map(([key, values]) => `${key} ${values.join(" ")}`),
    ...valueless,
  ].join("; ");
}

/**
 * Paths the middleware (proxy.ts) never runs on, relative to the leading
 * "/": the app's API routes, Next.js assets, and root-level static files
 * (public/ and the metadata routes: sw.js, manifest, icons, robots.txt,
 * sitemap.xml, offline.html). Only these extensions count as static, so a
 * page URL with a dot in it (an id, a slug) still gets the auth gate.
 *
 * proxy.ts must repeat this literally in `config.matcher` (Next.js reads
 * it statically); lib/__tests__/csp.test.ts checks the two agree.
 */
export const STATIC_FILE_EXTENSIONS = [
  "js",
  "mjs",
  "css",
  "map",
  "json",
  "webmanifest",
  "txt",
  "xml",
  "html",
  "ico",
  "png",
  "jpe?g",
  "gif",
  "svg",
  "webp",
  "avif",
  "woff2?",
  "ttf",
  "otf",
] as const;

const STATIC_FILE = `[^/]+\\.(?:${STATIC_FILE_EXTENSIONS.join("|")})`;

export const MIDDLEWARE_EXCLUDED = `api/|api$|_next/|${STATIC_FILE}$`;

/** The `config.matcher` entry of proxy.ts. */
export const MIDDLEWARE_MATCHER = `/((?!${MIDDLEWARE_EXCLUDED}).*)`;

/**
 * `headers()` sources (next.config.ts) covering exactly the paths above,
 * which get the static fallback policy. Every other path gets the nonce
 * policy from proxy.ts, so a response never carries both.
 */
export const FALLBACK_CSP_SOURCES = [
  "/api/:path*",
  "/_next/:path*",
  `/:file(${STATIC_FILE})`,
];
