"use server";

import { getLocale, getTranslations } from "next-intl/server";
import { describeApiError } from "@/lib/api-errors";
import { getInternalApiHeaders } from "@/lib/server/internal-api";
import { normalizeReferralCode, sanitizeOtp } from "@/lib/auth-flow";

/**
 * Signed-out account actions: sign-up and password recovery. They can't
 * go through `guardedAction` (there is no session), so they call the API
 * directly, identifying the visitor with the internal client-IP headers
 * (the API rate-limits these endpoints per IP).
 */

export type PublicActionResult<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: string;
      apiCode?: string;
      meta?: Record<string, unknown>;
      retryAfterSeconds?: number;
    };

const TIMEOUT_MS = 12_000;

function apiBaseUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(
    /\/$/,
    "",
  );
}

async function postPublic<T>(
  endpoint: string,
  body: unknown,
): Promise<PublicActionResult<T>> {
  const t = await getTranslations("apiErrors");
  const base = apiBaseUrl();
  if (!base) return { success: false, error: t("unavailable") };

  const locale = await getLocale();
  let res: Response;
  try {
    res = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: {
        ...(await getInternalApiHeaders()),
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-app-locale": locale,
      },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { success: false, error: t("unavailable") };
  }

  if (res.ok) {
    const data = (await res.json().catch(() => undefined)) as T | undefined;
    return { success: true, data };
  }

  let code: string | undefined;
  let meta: Record<string, unknown> | undefined;
  try {
    const parsed = (await res.json()) as { code?: unknown; meta?: unknown };
    if (typeof parsed.code === "string") code = parsed.code;
    if (parsed.meta && typeof parsed.meta === "object") {
      meta = parsed.meta as Record<string, unknown>;
    }
  } catch {
    // Plain-text answer (the per-IP limiter).
  }

  if (res.status === 429 && !code) {
    const tRate = await getTranslations("rateLimit");
    const seconds = Number(res.headers.get("retry-after"));
    const retryAfterSeconds =
      Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
    return {
      success: false,
      apiCode: "RATE_LIMITED",
      retryAfterSeconds,
      error:
        retryAfterSeconds != null
          ? tRate("messageWithWait", { seconds: retryAfterSeconds })
          : tRate("message"),
    };
  }

  const translated = describeApiError(code, meta, (k, v) => t(k, v), locale);
  if (!translated && code) {
    console.warn("[public-auth] Untranslated API error:", res.status, code);
  }
  return {
    success: false,
    apiCode: code,
    meta,
    error: translated ?? (res.status >= 500 ? t("unavailable") : t("rejected")),
  };
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  acceptTerms: boolean;
  marketingOptIn: boolean;
  referralCode?: string | null;
}

/** `POST /auth/register`. The caller signs in right after. */
export async function registerAccount(
  input: RegisterInput,
): Promise<PublicActionResult> {
  const t = await getTranslations("apiErrors");
  const username = input.username?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  if (
    !username ||
    username.length > 128 ||
    !email ||
    email.length > 254 ||
    !input.password ||
    input.password.length > 256
  ) {
    return { success: false, error: t("rejected") };
  }
  if (input.acceptTerms !== true) {
    return {
      success: false,
      apiCode: "TERMS_NOT_ACCEPTED",
      error: t("TERMS_NOT_ACCEPTED"),
    };
  }

  const locale = await getLocale();
  return postPublic("/auth/register", {
    username,
    email,
    password: input.password,
    first_name: input.firstName?.trim().slice(0, 50) || undefined,
    last_name: input.lastName?.trim().slice(0, 50) || undefined,
    accept_terms: true,
    marketing_opt_in: input.marketingOptIn === true,
    referral_code: normalizeReferralCode(input.referralCode) ?? undefined,
    locale,
  });
}

/**
 * `POST /auth/password/forgot`. Always "sent" for the person: the API
 * never reveals whether the account exists, and neither does this.
 */
export async function requestPasswordReset(
  identifier: string,
): Promise<PublicActionResult> {
  const t = await getTranslations("apiErrors");
  const value = identifier?.trim() ?? "";
  if (!value || value.length > 254) {
    return { success: false, error: t("rejected") };
  }
  const result = await postPublic("/auth/password/forgot", {
    identifier: value,
  });
  // Rate limiting is the only failure worth showing: anything else would
  // either leak nothing useful or tempt a retry loop.
  if (!result.success && result.apiCode === "RATE_LIMITED") return result;
  if (!result.success && !result.apiCode) return result;
  return { success: true };
}

/** `POST /auth/password/reset`. Every session is revoked on success. */
export async function resetPassword(input: {
  identifier: string;
  code: string;
  newPassword: string;
}): Promise<PublicActionResult> {
  const t = await getTranslations("apiErrors");
  const identifier = input.identifier?.trim() ?? "";
  const code = sanitizeOtp(input.code ?? "");
  if (
    !identifier ||
    identifier.length > 254 ||
    code.length !== 6 ||
    !input.newPassword ||
    input.newPassword.length > 256
  ) {
    return { success: false, error: t("rejected") };
  }
  return postPublic("/auth/password/reset", {
    identifier,
    code,
    new_password: input.newPassword,
  });
}
