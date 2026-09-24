import type { Metadata } from "next";
import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import { PublicGig } from "@/types/api";
import { notFound } from "next/navigation";
import { PublicGigView } from "./_components/public-gig-view";
import { PublicShell } from "@/components/public/public-shell";
import { getNonce } from "@/lib/server/nonce";
import { resolvePublicLocale } from "@/components/public/resolve-public-locale";
import { isGoneShareLinkError } from "@/lib/api-not-found";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const gig = await fetchServerApi<PublicGig>(apiPath`/public/gigs/${token}`);
    return {
      title: gig.venue,
      // A share link is meant for the people it's sent to, not for search.
      robots: { index: false, follow: false },
      openGraph: { title: gig.venue },
    };
  } catch {
    return { robots: { index: false, follow: false } };
  }
}

/**
 * The public, read-only view of a shared gig.
 *
 * Counterpart to app/s/[token] for setlists. The gig-sharing feature was
 * otherwise complete — the API endpoints, the share dialog, its QR code
 * and its "copy link" button all existed, and the link they produced
 * pointed here — but this route was never created, so every gig link
 * anyone shared resolved to a 404.
 *
 * Deliberately outside the `[locale]` segment, matching the setlist share
 * page: these links are opened by people who don't have an account and
 * shouldn't be bounced through locale negotiation to read a running order.
 */
export default async function PublicGigPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const [{ token }, { lang }] = await Promise.all([params, searchParams]);

  let gig: PublicGig;
  try {
    // Encoded rather than interpolated raw: this token arrives from a link
    // a stranger can craft. See lib/api-endpoint.ts.
    gig = await fetchServerApi<PublicGig>(apiPath`/public/gigs/${token}`);
  } catch (error) {
    // Only a link that doesn't exist (any more) is a 404; an outage goes
    // to error.tsx ("temporarily unavailable", with a retry).
    if (isGoneShareLinkError(error)) notFound();
    throw error;
  }

  const [{ locale, messages }, nonce] = await Promise.all([
    resolvePublicLocale(lang),
    getNonce(),
  ]);

  return (
    <PublicShell locale={locale} messages={messages} nonce={nonce}>
      <PublicGigView gig={gig} />
    </PublicShell>
  );
}
