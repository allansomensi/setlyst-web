/**
 * Whether the offline service worker (public/sw.js) runs in this build.
 * Always in production. Under `next dev` only when
 * NEXT_PUBLIC_ENABLE_SW_IN_DEV=true: there it would pre-cache every page
 * of the offline sync, and each one is compiled on demand, which makes
 * the dev server crawl.
 *
 * `env` is only a parameter for tests: the defaults are inlined at build
 * time (NODE_ENV and NEXT_PUBLIC_* are).
 */
export function isServiceWorkerEnabled(
  env: { nodeEnv?: string; enableInDev?: string } = {
    nodeEnv: process.env.NODE_ENV,
    enableInDev: process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV,
  },
): boolean {
  return env.nodeEnv === "production" || env.enableInDev === "true";
}
