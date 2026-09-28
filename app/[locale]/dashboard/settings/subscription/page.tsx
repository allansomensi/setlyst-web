import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchServerApi } from "@/lib/api-server";
import { pickLocalized } from "@/lib/localized";
import type { BillingInterval } from "@/lib/pricing";
import { getPublicPlans } from "@/lib/public-api";
import { getMyBilling } from "@/lib/server-data";
import { getSession } from "@/lib/server/session";
import type { PaginatedResponse, QuotaReport } from "@/types/api";
import type {
  CreditEntry,
  ReferralEntry,
  SubscriptionEvent,
} from "@/types/account";
import { SettingsPage, settingsMetadata } from "../_components/settings-page";
import { SubscriptionSection } from "../_components/subscription-section";

export function generateMetadata(): Promise<Metadata> {
  return settingsMetadata("subscription");
}

/** A failed load shows a notice in its card instead of the page failing. */
function orNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch(() => null);
}

export default async function SubscriptionSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const session = await getSession();
  const readOnly = Boolean(session?.user.impersonator);

  const [usage, billing, credits, referrals, history, plans] =
    await Promise.all([
      orNull(fetchServerApi<QuotaReport>("/users/me/quotas")),
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

  const checkoutParam = Array.isArray(params.checkout)
    ? params.checkout[0]
    : params.checkout;
  const checkoutStatus =
    checkoutParam === "success" || checkoutParam === "canceled"
      ? checkoutParam
      : null;

  // A plan chosen on the pricing page (signed-in visitors land here with
  // `?plan=<code>&interval=<monthly|yearly>`).
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

  return (
    <SettingsPage section="subscription">
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
    </SettingsPage>
  );
}
