import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { getMe, getMyBilling, getMyPreferences } from "@/lib/server-data";
import { getPublicPlans } from "@/lib/public-api";
import { pickLocalized } from "@/lib/localized";
import type { BillingInterval } from "@/lib/pricing";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import { readPendingGoogleLink } from "@/lib/server/google-link";
import type { PaginatedResponse, QuotaReport } from "@/types/api";
import type {
  CommunicationSettings,
  CreditEntry,
  LinkedIdentity,
  ReferralEntry,
  SecurityOverview,
  SubscriptionEvent,
} from "@/types/account";
import { BackupSection } from "./_components/backup-section";
import { CommunicationSection } from "./_components/communication-section";
import { DeleteAccountSection } from "./_components/delete-account-section";
import { DisplayDefaultsSection } from "./_components/display-defaults-section";
import { HelpSection } from "./_components/help-section";
import { OfflineSection } from "./_components/offline-section";
import { PdfDefaultsSection } from "./_components/pdf-defaults-section";
import { PersonalDataSection } from "./_components/personal-data-section";
import {
  SecuritySection,
  type GoogleLinkStatus,
} from "./_components/security-section";
import { SettingsForm } from "./_components/settings-form";
import {
  SettingsNav,
  SettingsSectionHeading,
} from "./_components/settings-nav";
import { SubscriptionSection } from "./_components/subscription-section";
import { getSession } from "@/lib/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

const GOOGLE_STATUSES: readonly GoogleLinkStatus[] = [
  "confirm",
  "linked",
  "mismatch",
  "expired",
  "failed",
];

/** A failed load shows a notice in its section instead of the page failing. */
function orNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch(() => null);
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("settings");
  const locale = await getLocale();
  const params = await searchParams;
  const session = await getSession();
  const readOnly = Boolean(session?.user.impersonator);

  const [
    preferences,
    me,
    usage,
    security,
    identities,
    communication,
    billing,
    credits,
    referrals,
    history,
    plans,
  ] = await Promise.all([
    getMyPreferences(),
    orNull(getMe()),
    orNull(fetchServerApi<QuotaReport>("/users/me/quotas")),
    orNull(fetchServerApi<SecurityOverview>("/users/me/security")),
    orNull(fetchServerApi<LinkedIdentity[]>("/users/me/identities")),
    orNull(fetchServerApi<CommunicationSettings>("/users/me/communication")),
    orNull(getMyBilling()),
    orNull(
      fetchServerApi<PaginatedResponse<CreditEntry>>(
        "/billing/credits?page=1&per_page=10",
      ),
    ),
    orNull(
      fetchServerApi<PaginatedResponse<ReferralEntry>>(
        "/billing/referrals?page=1&per_page=10",
      ),
    ),
    orNull(fetchServerApi<SubscriptionEvent[]>("/billing/history")),
    getPublicPlans(),
  ]);

  const tPlans = await getTranslations("billing.plans");
  const planNames: Record<string, string> = {
    basic: tPlans("basic"),
    intermediate: tPlans("intermediate"),
    pro: tPlans("pro"),
  };
  for (const plan of plans ?? []) {
    planNames[plan.code] = pickLocalized(plan.name, locale) || plan.code;
  }
  if (billing?.plan) {
    planNames[billing.plan.code] =
      pickLocalized(billing.plan.name, locale) || billing.plan.code;
  }

  const googleParam = Array.isArray(params.google)
    ? params.google[0]
    : params.google;
  let googleStatus = GOOGLE_STATUSES.includes(googleParam as GoogleLinkStatus)
    ? (googleParam as GoogleLinkStatus)
    : null;
  // Back from Google to confirm a link: only when the token is still
  // waiting for this account (a reload after it was used, or a crafted
  // link, just says it expired).
  if (
    googleStatus === "confirm" &&
    (readOnly || !(await readPendingGoogleLink(session?.user.id)))
  ) {
    googleStatus = "expired";
  }

  const checkoutParam = Array.isArray(params.checkout)
    ? params.checkout[0]
    : params.checkout;
  const checkoutStatus =
    checkoutParam === "success" || checkoutParam === "canceled"
      ? checkoutParam
      : null;

  // A plan chosen on the pricing page (signed-in visitors land here with
  // `?section=subscription&plan=<code>&interval=<monthly|yearly>`).
  const planParam = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const intervalParam = Array.isArray(params.interval)
    ? params.interval[0]
    : params.interval;
  const preselect =
    planParam && /^[a-z0-9_-]{2,32}$/.test(planParam)
      ? {
          plan: planParam,
          interval: (intervalParam === "yearly"
            ? "yearly"
            : "monthly") as BillingInterval,
        }
      : null;

  const username = me?.username ?? session?.user.name ?? "";
  const passwordSet = me?.password_set ?? security?.password_set ?? true;

  const sectionClass = "scroll-mt-20 space-y-4 lg:scroll-mt-6";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <SettingsNav />

        <div className="min-w-0 space-y-12 pt-4 lg:pt-0">
          <section
            id="preferences"
            className={sectionClass}
            aria-labelledby="preferences-title"
          >
            <SettingsSectionHeading
              id="preferences-title"
              title={t("sections.preferences")}
              description={t("sectionDescriptions.preferences")}
            />
            <SettingsForm initialPreferences={preferences} />
            <DisplayDefaultsSection />
            <PdfDefaultsSection />
            <OfflineSection />
          </section>

          <section
            id="security"
            className={sectionClass}
            aria-labelledby="security-title"
          >
            <SettingsSectionHeading
              id="security-title"
              title={t("sections.security")}
              description={t("sectionDescriptions.security")}
            />
            <SecuritySection
              username={username}
              passwordSet={passwordSet}
              passwordChangedAt={me?.password_changed_at ?? null}
              security={security}
              identities={identities}
              googleEnabled={isGoogleSignInEnabled()}
              googleStatus={googleStatus}
              readOnly={readOnly}
            />
          </section>

          <section
            id="communications"
            className={sectionClass}
            aria-labelledby="communications-title"
          >
            <SettingsSectionHeading
              id="communications-title"
              title={t("sections.communications")}
              description={t("sectionDescriptions.communications")}
            />
            <CommunicationSection initial={communication} />
          </section>

          <section
            id="subscription"
            className={sectionClass}
            aria-labelledby="subscription-title"
          >
            <SettingsSectionHeading
              id="subscription-title"
              title={t("sections.subscription")}
              description={t("sectionDescriptions.subscription")}
            />
            <SubscriptionSection
              billing={billing}
              usage={usage}
              history={history}
              credits={credits}
              referrals={referrals}
              planNames={planNames}
              plans={plans ?? []}
              checkoutStatus={checkoutStatus}
              readOnly={readOnly}
              preselect={preselect}
            />
          </section>

          <section
            id="data"
            className={sectionClass}
            aria-labelledby="data-title"
          >
            <SettingsSectionHeading
              id="data-title"
              title={t("sections.data")}
              description={t("sectionDescriptions.data")}
            />
            <BackupSection />
            {/* The owner's own data: not for staff viewing as the account
                (the API refuses it too). */}
            {!readOnly && <PersonalDataSection />}
            <DeleteAccountSection
              username={username}
              passwordSet={passwordSet}
              readOnly={readOnly}
            />
          </section>

          <section
            id="help"
            className={sectionClass}
            aria-labelledby="help-title"
          >
            <SettingsSectionHeading
              id="help-title"
              title={t("sections.help")}
              description={t("sectionDescriptions.help")}
            />
            <HelpSection />
          </section>
        </div>
      </div>
    </div>
  );
}
