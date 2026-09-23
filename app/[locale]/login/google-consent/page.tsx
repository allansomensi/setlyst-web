import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import {
  GOOGLE_SIGNUP_COOKIE,
  REFERRAL_COOKIE,
  normalizeReferralCode,
  parseGoogleSignup,
} from "@/lib/auth-flow";
import { safeCallbackPath } from "@/lib/links";
import { GoogleConsentForm } from "./_components/google-consent-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("googleAuth");
  return { title: t("consentMetaTitle") };
}

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/**
 * The consent step of a sign-up with Google: the API refused to create
 * the account until the terms are accepted (`TERMS_NOT_ACCEPTED` with
 * signup meta). Accepting starts the Google sign-in again, this time with
 * `accept_terms: true`.
 */
export default async function GoogleConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  if (!isGoogleSignInEnabled()) redirect(`/${locale}/login`);

  const params = await searchParams;
  const store = await cookies();
  const signup = parseGoogleSignup(store.get(GOOGLE_SIGNUP_COOKIE)?.value);
  const referral =
    normalizeReferralCode(firstParam(params.ref)) ??
    normalizeReferralCode(store.get(REFERRAL_COOKIE)?.value);

  return (
    <AuthShell>
      <GoogleConsentForm
        email={signup?.email ?? null}
        name={signup?.name ?? null}
        referralCode={referral}
        callbackPath={safeCallbackPath(firstParam(params.callbackUrl))}
      />
    </AuthShell>
  );
}
