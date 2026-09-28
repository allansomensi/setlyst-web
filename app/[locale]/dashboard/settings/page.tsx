import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getMyPreferences } from "@/lib/server-data";
import { ChordDiagramsSection } from "./_components/chord-diagrams-section";
import { DisplayDefaultsSection } from "./_components/display-defaults-section";
import { OfflineSection } from "./_components/offline-section";
import { PdfDefaultsSection } from "./_components/pdf-defaults-section";
import { SettingsForm } from "./_components/settings-form";
import { SettingsPage, settingsMetadata } from "./_components/settings-page";
import { isSettingsSection, settingsHref } from "./_lib/sections";

export function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("preferences");
}

/** The settings' first page: preferences. */
export default async function PreferencesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Links from before the settings were split into pages
  // (`?section=subscription&plan=pro`): open that category's page, with
  // the rest of the query. Anchors (`#security`) are handled by the
  // navigation, in the browser.
  const section = Array.isArray(params.section)
    ? params.section[0]
    : params.section;
  if (isSettingsSection(section) && section !== "preferences") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "section" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        query.append(key, item);
      }
    }
    const search = query.size > 0 ? `?${query}` : "";
    redirect({
      href: `${settingsHref(section)}${search}`,
      locale: await getLocale(),
    });
  }

  const preferences = await getMyPreferences();

  return (
    <SettingsPage section="preferences">
      <SettingsForm initialPreferences={preferences} />
      <DisplayDefaultsSection />
      <ChordDiagramsSection />
      <PdfDefaultsSection />
      <OfflineSection />
    </SettingsPage>
  );
}
