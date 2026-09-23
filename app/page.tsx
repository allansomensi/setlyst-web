import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

/**
 * Fallback for a locale-less `/` that reached the app (proxy.ts normally
 * redirects it first): send the visitor to the landing page in their
 * language. The installed PWA opens at `/dashboard` (see manifest.json),
 * so this never gets in the way of app launches.
 */
export default async function Home() {
  const locale = await getLocale();

  redirect(`/${locale}`);
}
