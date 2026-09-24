import { cache } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import { PublicSetlist } from "@/types/api";
import { notFound } from "next/navigation";
import { PublicSetlistView } from "./_components/public-setlist-view";
import { PublicShell } from "@/components/public/public-shell";
import { getNonce } from "@/lib/server/nonce";
import { resolvePublicLocale } from "@/components/public/resolve-public-locale";
import { isGoneShareLinkError } from "@/lib/api-not-found";
import { clientMessages } from "@/i18n/client-messages";

// One fetch per request, shared by the metadata and the page.
const getPublicSetlist = cache(async (token: string) => {
  try {
    // Encoded rather than interpolated raw: this token is the one value in
    // the app that arrives from a link a stranger can craft and send.
    return await fetchServerApi<PublicSetlist>(
      apiPath`/public/setlists/${token}`,
    );
  } catch (error) {
    // Only "this link doesn't exist (any more)" becomes null (→ the "link
    // turned off" page). An outage or a 500 is thrown, so error.tsx says
    // "temporarily unavailable" with a retry instead of telling a band
    // chat the link was revoked.
    if (isGoneShareLinkError(error)) return null;
    throw error;
  }
});

interface PublicSetlistPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PublicSetlistPageProps): Promise<Metadata> {
  const [{ token }, { lang }] = await Promise.all([params, searchParams]);
  const setlist = await getPublicSetlist(token);
  if (!setlist) return {};

  // Without a description, the link preview (WhatsApp, band chats) says
  // what the setlist is: "12 músicas · 48 min".
  let description = setlist.description?.trim() || undefined;
  if (!description) {
    const { locale } = await resolvePublicLocale(lang);
    const t = await getTranslations({ locale, namespace: "publicPage" });
    description = t("metaSummary", {
      count: setlist.songs.length,
      minutes: Math.round((setlist.total_duration ?? 0) / 60),
    });
  }

  return {
    title: setlist.title,
    description,
    // A share link is meant for the people it's sent to, not for search.
    robots: { index: false, follow: false },
    openGraph: {
      title: setlist.title,
      description,
    },
  };
}

export default async function PublicSetlistPage({
  params,
  searchParams,
}: PublicSetlistPageProps) {
  const [{ token }, { lang }] = await Promise.all([params, searchParams]);

  const setlist = await getPublicSetlist(token);
  if (!setlist) notFound();

  const [{ locale, messages }, nonce] = await Promise.all([
    resolvePublicLocale(lang),
    getNonce(),
  ]);

  return (
    <PublicShell
      locale={locale}
      messages={clientMessages(messages, "publicShare")}
      nonce={nonce}
    >
      <PublicSetlistView setlist={setlist} token={token} />
    </PublicShell>
  );
}
