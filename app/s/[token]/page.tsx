import { cache } from "react";
import type { Metadata } from "next";
import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import { PublicSetlist } from "@/types/api";
import { notFound } from "next/navigation";
import { PublicSetlistView } from "./_components/public-setlist-view";
import { PublicShell } from "@/components/public/public-shell";
import { getNonce } from "@/lib/server/nonce";
import { resolvePublicLocale } from "@/components/public/resolve-public-locale";

// One fetch per request, shared by the metadata and the page.
const getPublicSetlist = cache(async (token: string) => {
  try {
    // Encoded rather than interpolated raw: this token is the one value in
    // the app that arrives from a link a stranger can craft and send.
    return await fetchServerApi<PublicSetlist>(
      apiPath`/public/setlists/${token}`,
    );
  } catch {
    return null;
  }
});

interface PublicSetlistPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: PublicSetlistPageProps): Promise<Metadata> {
  const { token } = await params;
  const setlist = await getPublicSetlist(token);
  if (!setlist) return {};

  return {
    title: setlist.title,
    description: setlist.description ?? undefined,
    // A share link is meant for the people it's sent to, not for search.
    robots: { index: false, follow: false },
    openGraph: {
      title: setlist.title,
      description: setlist.description ?? undefined,
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
    <PublicShell locale={locale} messages={messages} nonce={nonce}>
      <PublicSetlistView setlist={setlist} token={token} />
    </PublicShell>
  );
}
