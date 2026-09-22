import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import { PublicGig } from "@/types/api";
import { notFound } from "next/navigation";
import { PublicGigView } from "./_components/public-gig-view";

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
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let gig: PublicGig;
  try {
    // Encoded rather than interpolated raw: this token arrives from a link
    // a stranger can craft. See lib/api-endpoint.ts.
    gig = await fetchServerApi<PublicGig>(apiPath`/public/gigs/${token}`);
  } catch {
    notFound();
  }

  return <PublicGigView gig={gig} />;
}
