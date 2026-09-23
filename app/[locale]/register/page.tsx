import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import { getPublicPlans } from "@/lib/public-api";
import { pickLocalized } from "@/lib/localized";
import { isBillingEnforced } from "@/lib/pricing";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/lib/auth-flow";
import { RegisterForm } from "./_components/register-form";

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
  const locale = await getLocale();

  // `?ref=` wins; otherwise a code remembered from an earlier visit.
  const fromLink = normalizeReferralCode(firstParam(params.ref));
  const fromCookie = normalizeReferralCode(
    (await cookies()).get(REFERRAL_COOKIE)?.value,
  );

  const planCode = planCodeOf(firstParam(params.plan));
  let planName: string | null = null;
  if (planCode) {
    const plans = await getPublicPlans();
    const plan = plans?.find((p) => p.code === planCode);
    planName = plan ? pickLocalized(plan.name, locale) || plan.code : null;
  }

  return (
    <AuthShell>
      <RegisterForm
        googleEnabled={isGoogleSignInEnabled()}
        initialReferral={fromLink ?? fromCookie}
        referralFromLink={fromLink}
        planName={planName}
        billingEnforced={isBillingEnforced()}
      />
    </AuthShell>
  );
}
