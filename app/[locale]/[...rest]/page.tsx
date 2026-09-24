import { notFound } from "next/navigation";

/**
 * Any path under a locale that matches no page: hands over to
 * `[locale]/not-found.tsx`, so unknown URLs get the translated 404 inside
 * the app's layout instead of Next.js's bare default page.
 */
export default function CatchAll() {
  notFound();
}
