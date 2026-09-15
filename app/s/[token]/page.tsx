import { fetchServerApi } from "@/lib/api-server";
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
    setlist = await fetchServerApi<PublicSetlist>(`/public/setlists/${token}`);
  } catch {
    notFound();
  }

  return <PublicSetlistView setlist={setlist} token={token} />;
}
