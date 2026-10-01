import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import {
  getBillingMode,
  getPlatformStatus,
  getPublicPlans,
} from "@/lib/public-api";
import { signUpState } from "@/lib/maintenance";
import { pickLocalized } from "@/lib/localized";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/lib/auth-flow";
import { safeCallbackPath } from "@/lib/links";
import { RegisterForm } from "./_components/register-form";
import { SignUpsClosed } from "./_components/sign-ups-closed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("register") };
}

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/** A plan code as it may appear in `?plan=` (lowercase, short). */
function planCodeOf(value: string | null): string | null {
  const code = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9_-]{1,40}$/.test(code) ? code : null;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const planCode = planCodeOf(firstParam(params.plan));

  // Independent reads, side by side rather than one after the other.
  const [locale, cookieStore, billingMode, plans, platform] = await Promise.all(
    [
      getLocale(),
      cookies(),
      getBillingMode(),
      planCode ? getPublicPlans() : null,
      getPlatformStatus(),
    ],
  );
  const callbackPath = safeCallbackPath(firstParam(params.callbackUrl));

  // Sign-ups closed or the platform in maintenance: the API would refuse
  // the account, so the page says so instead of offering the form.
  const state = signUpState(platform);
  if (state !== "open") {
    return (
      <AuthShell>
        <SignUpsClosed
          reason={state}
          maintenance={platform?.maintenance}
          callbackPath={callbackPath}
        />
      </AuthShell>
    );
  }

  // `?ref=` wins; otherwise a code remembered from an earlier visit.
  const fromLink = normalizeReferralCode(firstParam(params.ref));
  const fromCookie = normalizeReferralCode(
    cookieStore.get(REFERRAL_COOKIE)?.value,
  );

  const plan = planCode ? plans?.find((p) => p.code === planCode) : undefined;
  const planName = plan ? pickLocalized(plan.name, locale) || plan.code : null;

  return (
    <AuthShell>
      <RegisterForm
        googleEnabled={isGoogleSignInEnabled()}
        initialReferral={fromLink ?? fromCookie}
        referralFromLink={fromLink}
        planName={planName}
        billingEnforced={!billingMode.beta}
        trialDays={billingMode.trialDays}
        callbackPath={callbackPath}
        closedNotices={{
          // When the API refuses the sign-up itself (the switch changed
          // after this page was rendered).
          closed: <SignUpsClosed reason="closed" callbackPath={callbackPath} />,
          maintenance: (
            <SignUpsClosed reason="maintenance" callbackPath={callbackPath} />
          ),
        }}
      />
    </AuthShell>
  );
}
