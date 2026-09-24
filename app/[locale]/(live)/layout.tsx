import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import { getMyPreferences } from "@/lib/server-data";
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from "@/lib/ui-settings";
import { getSession } from "@/lib/server/session";
import { ScopedMessages } from "@/components/providers/scoped-messages";
import { OfflineSyncProvider } from "@/components/providers/offline-sync-provider";

/**
 * The bare shell Live Mode renders in (both the setlist and the single-song
 * viewer).
 *
 * The two live routes sit in their own route group so they never mount the
 * dashboard chrome: no sidebar or mobile menu (whose links a keyboard user
 * would otherwise Tab into underneath the overlay), no notification
 * polling, and above all none of the dialogs that can open on their own —
 * the terms gate, announcement modals and the trial welcome — which used
 * to pop up over the lyrics mid-song. Those all come back the moment the
 * performer leaves Live Mode for any dashboard page.
 *
 * Only what the viewers read is kept: the account's UI settings (the Live
 * Mode display defaults) and the same session check as the dashboard.
 */
export default async function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) redirect(`/${locale}/login`);
  if (session.error === "TokenExpired") {
    redirect(`/${locale}/login?reason=expired`);
  }

  const uiSettings = await getMyPreferences()
    .then((prefs) => normalizeUiSettings(prefs?.ui_settings))
    .catch(() => DEFAULT_UI_SETTINGS);

  return (
    <ScopedMessages area="live">
      {/* Keeps the offline copy fresh while performing, too. */}
      <OfflineSyncProvider>
        <UiSettingsProvider initial={uiSettings}>
          <div className="bg-background h-dvh">{children}</div>
        </UiSettingsProvider>
      </OfflineSyncProvider>
    </ScopedMessages>
  );
}
