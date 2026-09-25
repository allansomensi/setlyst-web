import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Sidebar } from "./_components/sidebar";
import { MobileNav } from "./_components/mobile-nav";
import { OfflineStatusBanner } from "@/components/offline-status-banner";
import { AnnouncementModalHost } from "@/components/announcements/announcement-modal-host";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";
import { getMe, getMyBilling, getMyPreferences } from "@/lib/server-data";
import { pickLocalized } from "@/lib/localized";
import { accountPlanStatus, trialInfo, type BillingState } from "@/lib/trial";
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from "@/lib/ui-settings";
import { LEGAL_VERSION } from "@/lib/legal";
import { AccountGates } from "./_components/account-gates";
import { TrialWelcomeDialog } from "./_components/trial/trial-welcome-dialog";
import { PlanStatusBanner } from "./_components/trial/plan-status-banner";
import { DashboardScrollArea } from "./_components/dashboard-scroll-area";
import { ActionToastSetup } from "./_components/action-toast-setup";
import { getSession } from "@/lib/server/session";
import { ScopedMessages } from "@/components/providers/scoped-messages";
import { OfflineSyncProvider } from "@/components/providers/offline-sync-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) redirect(`/${locale}/login`);
  if (session.error === "TokenExpired") {
    // The login page clears the offline copy of the account's data when
    // told the session ran out (see LoginForm).
    redirect(`/${locale}/login?reason=expired`);
  }

  // Both reads are independent, so they run in parallel. Neither may take
  // the dashboard down when it fails (offline, an API blip):
  // - account-level UI settings (live/PDF defaults, list size, "what's
  //   new" state) fall back to the defaults;
  // - the e-mail verification and terms prompts
  //   (./_components/account-gates) are read fresh from the API; without
  //   it, no e-mail prompt (nothing reliable to show) and the terms flag
  //   from the session.
  // - the running trial (if any), shown in the navigation so it's always
  //   clear why every feature is unlocked and until when.
  const [uiSettings, me, billing] = await Promise.all([
    getMyPreferences()
      .then((prefs) => normalizeUiSettings(prefs?.ui_settings))
      .catch(() => DEFAULT_UI_SETTINGS),
    getMe().catch(() => null),
    getMyBilling().catch(() => null),
  ]);

  const planName = billing?.plan
    ? pickLocalized(billing.plan.name, locale)
    : "";
  const trial = trialInfo(billing, planName);
  // Trial / trial ending / ended / payment failed, for the navigation chip
  // and the banner. See lib/trial.ts.
  const planStatus = accountPlanStatus(
    billing as BillingState | null,
    planName,
  );
  const tCommon = await getTranslations("common");

  const user = {
    id: session.user?.id,
    name: session.user?.name,
    role: session.user?.role,
    avatarUrl: me?.avatar_url ?? null,
  };

  const gates = {
    username: me?.username ?? session.user.name ?? "",
    email: me?.email ?? null,
    emailVerified: me ? me.email_verified && Boolean(me.email) : true,
    termsAccepted: me
      ? me.terms_version === LEGAL_VERSION
      : session.user.termsAccepted,
    passwordSet: me?.password_set ?? true,
    readOnly: Boolean(session.user.impersonator),
    unlockNote:
      billing?.access === "unverified"
        ? billing.enforced
          ? ("trial" as const)
          : ("beta" as const)
        : null,
  };

  return (
    <ScopedMessages area="dashboard">
      <OfflineSyncProvider>
        <UiSettingsProvider initial={uiSettings}>
          {/* A fixed-height shell (dvh, so mobile browser bars are accounted
          for) with the page scrolling inside <main>. `dashboard-clip`
          (globals.css) clips instead of hiding: a hidden box can still be
          scrolled by script (scrollIntoView, focus), which used to slide the
          whole dashboard out from under the sidebar. `relative` makes the
          shell the containing block of absolutely positioned descendants,
          so the clip applies to them too (see DashboardScrollArea). */}
          <div className="bg-background dashboard-clip relative flex h-dvh flex-col md:flex-row">
            <a
              href="#main-content"
              className="bg-primary text-primary-foreground focus-visible:ring-ring/50 sr-only z-[60] rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-[max(0.75rem,env(safe-area-inset-top))] focus:left-3 focus-visible:ring-3"
            >
              {tCommon("skipToContent")}
            </a>
            <Sidebar user={user} planStatus={planStatus} />
            <MobileNav user={user} planStatus={planStatus} />
            <main
              id="main-content"
              tabIndex={-1}
              className="dashboard-clip flex min-h-0 flex-1 flex-col outline-none"
            >
              <ImpersonationBanner />
              <PlanStatusBanner status={planStatus} readOnly={gates.readOnly} />
              <AccountGates {...gates} />
              <OfflineStatusBanner />
              <ActionToastSetup
                email={gates.email}
                passwordSet={gates.passwordSet}
                username={gates.username}
                readOnly={gates.readOnly}
              />
              <AnnouncementModalHost />
              {!gates.readOnly && gates.termsAccepted && (
                <TrialWelcomeDialog
                  trial={trial}
                  name={me?.first_name || gates.username}
                />
              )}
              {/* Bottom inset: the home indicator of the installed iOS app;
              side insets: landscape on a notched phone. */}
              <DashboardScrollArea className="flex-1 overflow-y-auto overscroll-contain pt-4 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] md:p-8 md:pr-[max(2rem,env(safe-area-inset-right))] md:pb-[max(2rem,env(safe-area-inset-bottom))]">
                {children}
              </DashboardScrollArea>
            </main>
          </div>
        </UiSettingsProvider>
      </OfflineSyncProvider>
    </ScopedMessages>
  );
}
