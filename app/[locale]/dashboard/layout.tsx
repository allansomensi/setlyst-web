import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";
import { OfflineStatusBanner } from "@/components/offline-status-banner";
import { AnnouncementModalHost } from "@/components/announcements/announcement-modal-host";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import { getMe, getMyPreferences } from "@/lib/server-data";
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from "@/lib/ui-settings";
import { LEGAL_VERSION } from "@/lib/legal";
import { AccountGates } from "./_components/account-gates";

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

  // Both reads are independent, so they run in parallel. Neither may take
  // the dashboard down when it fails (offline, an API blip):
  // - account-level UI settings (live/PDF defaults, list size, "what's
  //   new" state) fall back to the defaults;
  // - the e-mail verification and terms prompts
  //   (./_components/account-gates) are read fresh from the API; without
  //   it, no e-mail prompt (nothing reliable to show) and the terms flag
  //   from the session.
  const [uiSettings, me] = await Promise.all([
    getMyPreferences()
      .then((prefs) => normalizeUiSettings(prefs?.ui_settings))
      .catch(() => DEFAULT_UI_SETTINGS),
    getMe().catch(() => null),
  ]);

  const user = { name: session.user?.name, role: session.user?.role };

  const gates = {
    username: me?.username ?? session.user.name ?? "",
    email: me?.email ?? null,
    emailVerified: me ? me.email_verified && Boolean(me.email) : true,
    termsAccepted: me
      ? me.terms_version === LEGAL_VERSION
      : session.user.termsAccepted,
    passwordSet: me?.password_set ?? true,
    readOnly: Boolean(session.user.impersonator),
  };

  return (
    <UiSettingsProvider initial={uiSettings}>
      {/* A fixed-height shell (dvh, so mobile browser bars are accounted
          for) with the page scrolling inside <main>. */}
      <div className="bg-background flex h-dvh flex-col overflow-hidden md:flex-row">
        <Sidebar user={user} />
        <MobileNav user={user} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ImpersonationBanner />
          <AccountGates {...gates} />
          <OfflineStatusBanner />
          <AnnouncementModalHost />
          <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </UiSettingsProvider>
  );
}
