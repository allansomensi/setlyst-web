"use server";

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import {
  GOOGLE_2FA_COOKIE,
  GOOGLE_ERROR_COOKIE,
  GOOGLE_INTENT_COOKIE,
  GOOGLE_INTENT_MAX_AGE,
  GOOGLE_SIGNUP_COOKIE,
  normalizeReferralCode,
  parseGoogleSignInError,
  parseGoogleTwoFactor,
  type GoogleIntentMode,
  type GoogleTwoFactorChallenge,
} from "@/lib/auth-flow";
import { safeCallbackPath } from "@/lib/links";
import type { SignInError } from "@/lib/sign-in-errors";

export interface PrepareGoogleInput {
  mode?: GoogleIntentMode;
  referralCode?: string | null;
  /**
   * The sign-up consent checkbox: Terms of Use, Privacy Policy and the age
   * declaration (18+, or 16-17 with a guardian's consent) in one.
   */
  acceptTerms?: boolean;
  marketingOptIn?: boolean;
  callbackPath?: string | null;
}

/**
 * Saves what the person chose (referral code, consent, marketing opt-in,
 * destination) in a short-lived httpOnly cookie right before the browser
 * leaves for Google. The `signIn` callback reads it back when Google
 * returns (lib/auth.ts): the OAuth round trip can't carry it otherwise.
 *
 * Returns false when Google sign-in isn't configured, or when linking is
 * requested without a (non-impersonated) session.
 */
export async function prepareGoogleSignIn(
  input: PrepareGoogleInput = {},
): Promise<boolean> {
  if (!isGoogleSignInEnabled()) return false;

  const mode: GoogleIntentMode = input.mode === "link" ? "link" : "signin";
  if (mode === "link") {
    const session = await getServerSession(authOptions);
    if (!session || session.error || session.user.impersonator) return false;
  }

  const store = await cookies();
  store.set(
    GOOGLE_INTENT_COOKIE,
    JSON.stringify({
      mode,
      locale: await getLocale(),
      referralCode:
        mode === "signin" ? normalizeReferralCode(input.referralCode) : null,
      acceptTerms: mode === "signin" && input.acceptTerms === true,
      ageConfirmed: mode === "signin" && input.acceptTerms === true,
      marketingOptIn: mode === "signin" && input.marketingOptIn === true,
      callbackPath: safeCallbackPath(input.callbackPath ?? null),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GOOGLE_INTENT_MAX_AGE,
    },
  );
  if (input.acceptTerms) store.delete(GOOGLE_SIGNUP_COOKIE);
  return true;
}

/**
 * The two-factor challenge of a Google sign-in, handed over by the OAuth
 * callback in an httpOnly cookie (lib/auth.ts). Read once: the cookie is
 * cleared right away, so a reload or another tab can't reuse it.
 */
export async function takeGoogleTwoFactorChallenge(): Promise<GoogleTwoFactorChallenge | null> {
  const store = await cookies();
  const raw = store.get(GOOGLE_2FA_COOKIE)?.value;
  if (raw === undefined) return null;
  store.delete(GOOGLE_2FA_COOKIE);
  return parseGoogleTwoFactor(raw);
}

/**
 * Why a Google sign-in failed, with its details (a suspension's end date
 * and reason, a lockout), handed over by the OAuth callback in an httpOnly
 * cookie (lib/auth.ts). Read once, like the two-factor challenge.
 */
export async function takeGoogleSignInError(): Promise<SignInError | null> {
  const store = await cookies();
  const raw = store.get(GOOGLE_ERROR_COOKIE)?.value;
  if (raw === undefined) return null;
  store.delete(GOOGLE_ERROR_COOKIE);
  return parseGoogleSignInError(raw);
}
