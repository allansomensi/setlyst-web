import type { Metadata } from "next";
import { fetchServerApi } from "@/lib/api-server";
import type { CommunicationSettings } from "@/types/account";
import { CommunicationSection } from "../_components/communication-section";
import { SettingsPage, settingsMetadata } from "../_components/settings-page";

export function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("communications");
}

export default async function CommunicationsSettingsPage() {
  // A failed load shows a notice in the card instead of the page failing.
  const communication = await fetchServerApi<CommunicationSettings>(
    "/users/me/communication",
  ).catch(() => null);

  return (
    <SettingsPage section="communications">
      <CommunicationSection initial={communication} />
    </SettingsPage>
  );
}
