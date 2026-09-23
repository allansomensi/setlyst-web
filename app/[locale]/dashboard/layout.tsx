import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";
import { OfflineStatusBanner } from "@/components/offline-status-banner";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import { getMyPreferences } from "@/lib/server-data";
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from "@/lib/ui-settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const locale = await getLocale();

  if (!session || session.error === "TokenExpired") {
    redirect(`/${locale}/login`);
  }

  // Account-level UI settings (live/PDF defaults, list size, "what's new"
  // state). A failed fetch must never take the dashboard down — offline
  // or during an API blip, the defaults are a perfectly usable fallback.
  const uiSettings = await getMyPreferences()
    .then((prefs) => normalizeUiSettings(prefs?.ui_settings))
    .catch(() => DEFAULT_UI_SETTINGS);

  const user = { name: session.user?.name, role: session.user?.role };

  return (
    <UiSettingsProvider initial={uiSettings}>
      {/* A fixed-height shell (dvh, so mobile browser bars are accounted
          for) with the page scrolling inside <main>. */}
      <div className="bg-muted/40 flex h-dvh flex-col overflow-hidden md:flex-row">
        <Sidebar user={user} />
        <MobileNav user={user} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ImpersonationBanner />
          <OfflineStatusBanner />
          <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </UiSettingsProvider>
  );
}
