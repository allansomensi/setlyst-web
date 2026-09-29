import type { Metadata } from "next";
import { fetchServerApiOnce } from "@/lib/server-data";
import { apiPath } from "@/lib/api-endpoint";
import { PublicGig } from "@/types/api";
import { notFound } from "next/navigation";
import { PublicGigView } from "./_components/public-gig-view";
import { PublicShell } from "@/components/public/public-shell";
import { getNonce } from "@/lib/server/nonce";
import { resolvePublicLocale } from "@/components/public/resolve-public-locale";
import { isGoneShareLinkError } from "@/lib/api-not-found";
import { clientMessages } from "@/i18n/client-messages";

async function getPublicGig(token: string): Promise<PublicGig | null> {
  try {
    // Encoded rather than interpolated raw: this token arrives from a link
    // a stranger can craft. See lib/api-endpoint.ts.
    return await fetchServerApiOnce<PublicGig>(apiPath`/public/gigs/${token}`);
  } catch (error) {
    // Only a link that doesn't exist (any more) is a 404; an outage goes
    // to error.tsx ("temporarily unavailable", with a retry).
    if (isGoneShareLinkError(error)) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const gig = await fetchServerApiOnce<PublicGig>(
      apiPath`/public/gigs/${token}`,
    );
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

  // The locale and nonce don't depend on the gig: resolved alongside the
  // API call rather than after it.
  const [gig, { locale, messages }, nonce] = await Promise.all([
    getPublicGig(token),
    resolvePublicLocale(lang),
    getNonce(),
  ]);
  if (!gig) notFound();

  return (
    <PublicShell
      locale={locale}
      messages={clientMessages(messages, "publicShare")}
      nonce={nonce}
    >
      <PublicGigView gig={gig} />
    </PublicShell>
  );
}
