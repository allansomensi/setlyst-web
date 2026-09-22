import { fetchServerApi } from "@/lib/api-server";
import { apiPath } from "@/lib/api-endpoint";
import { PublicSetlist } from "@/types/api";
import { notFound } from "next/navigation";
import { PublicSetlistView } from "./_components/public-setlist-view";

export default async function PublicSetlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let setlist: PublicSetlist;
  try {
    // Encoded rather than interpolated raw: this token is the one value in
    // the app that arrives from a link a stranger can craft and send.
    setlist = await fetchServerApi<PublicSetlist>(
      apiPath`/public/setlists/${token}`,
    );
  } catch {
    notFound();
  }

  return <PublicSetlistView setlist={setlist} token={token} />;
}
