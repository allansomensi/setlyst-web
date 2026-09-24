import "server-only";

import { NextAuthOptions, type User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { routing } from "@/i18n/routing";
import {
  getInternalApiHeaders,
  headersFromRecord,
} from "@/lib/server/internal-api";
import { getSessionToken } from "@/lib/server/api-token";
import { isGoogleSignInEnabled } from "@/lib/server/google-auth";
import { encodeSignInError, type SignInErrorCode } from "@/lib/sign-in-errors";
import {
  GOOGLE_2FA_COOKIE,
  GOOGLE_ERROR_COOKIE,
  GOOGLE_ERROR_MAX_AGE,
  GOOGLE_INTENT_COOKIE,
  GOOGLE_INTENT_MAX_AGE,
  GOOGLE_LINK_COOKIE,
  GOOGLE_LINK_MAX_AGE,
  GOOGLE_SIGNUP_COOKIE,
  googleTwoFactorMaxAge,
  parseGoogleIntent,
  serializeGoogleLink,
  serializeGoogleSignInError,
  serializeGoogleTwoFactor,
  type GoogleIntent,
} from "@/lib/auth-flow";
import { LEGAL_VERSION } from "@/lib/legal";
import { safeAuthRedirect } from "@/lib/links";
import { isUuid } from "@/lib/uuid";

if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
  throw new Error(
    "ERROR: NEXTAUTH_SECRET is not set or is too weak. It must be at least 32 characters long.",
  );
}

interface SetlystJwtPayload {
  sub: string;
  username: string;
  role: string;
  status: string;
  exp: number;
  iat: number;
  /** Set on impersonation tokens: the staff member viewing as `sub`. */
  imp?: string;
}

/** `LoginResponse` of the API (password, second factor and Google). */
interface LoginResponseBody {
  token: string;
  is_first_login: boolean;
  must_change_password?: boolean;
  terms_accepted?: boolean;
  email_verified?: boolean;
  is_new_account?: boolean;
}

/** The part of `UserPublic` the session mirrors. */
interface AccountFlags {
  email_verified?: unknown;
  terms_version?: unknown;
  two_factor_enabled?: unknown;
}

/**
 * Sign-in failures are reported to the login page as a JSON-encoded
 * `Error` message (NextAuth forwards it as `signIn()`'s `error`), so the
 * page can show the exact reason (suspension end date, lockout time) in
 * the user's language, or continue with the second step of a two-factor
 * sign-in. See `parseSignInError` in lib/sign-in-errors.ts.
 *
 * The message travels in the JSON answer of the credentials callback,
 * never in a navigated URL, so a challenge token doesn't reach any
 * access log.
 */
function signInError(
  code: SignInErrorCode | string,
  meta?: Record<string, unknown> | null,
): Error {
  return new Error(encodeSignInError(code as SignInErrorCode, meta));
}

const VALID_ROLES = ["user", "moderator", "admin"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: string): role is ValidRole {
  return VALID_ROLES.includes(role as ValidRole);
}

function isSupportedLocale(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}

function getApiBaseUrl(): string {
  return (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(
    /\/$/,
    "",
  );
}

/**
 * Reads the account's saved interface language straight after sign-in.
 *
 * This is what lets the app open in the right language on a device that
 * has never been used before (a freshly installed PWA, a new phone, a
 * cleared browser). Locale resolution otherwise has only the URL, the
 * `NEXT_LOCALE` cookie and the `Accept-Language` header to go on, and on
 * a first launch the first two don't exist yet. Carrying the preference
 * in the session token gives `proxy.ts` something authoritative to
 * redirect with (see `resolvePreferredLocale` there).
 *
 * Best-effort by design: preferences are cosmetic, so a slow or failing
 * call here must never turn a valid sign-in into a failed one.
 */
async function fetchPreferredLanguage(
  apiToken: string,
  internalHeaders: Record<string, string>,
): Promise<string | null> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/users/me/preferences`, {
      headers: {
        ...internalHeaders,
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) return null;

    const body: unknown = await res.json();
    const language = (body as { language?: unknown })?.language;

    return isSupportedLocale(language) ? language : null;
  } catch {
    return null;
  }
}

/**
 * The account flags the dashboard gates read (e-mail verified, current
 * terms accepted, two-factor on), fresh from `GET /users/me`. Null when
 * the lookup fails: the caller keeps what it had.
 */
async function fetchAccountFlags(apiToken: string): Promise<{
  emailVerified: boolean;
  termsAccepted: boolean;
  twoFactorEnabled: boolean;
} | null> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/users/me`, {
      headers: {
        ...(await getInternalApiHeaders()),
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AccountFlags;
    return {
      emailVerified: body.email_verified === true,
      termsAccepted: body.terms_version === LEGAL_VERSION,
      twoFactorEnabled: body.two_factor_enabled === true,
    };
  } catch {
    return null;
  }
}

/** `{ code, meta }` of a failed API answer, with sensible fallbacks. */
async function readApiFailure(
  res: Response,
): Promise<{ code: string; meta: Record<string, unknown> | null }> {
  let code: string | null = null;
  let meta: Record<string, unknown> | null = null;
  try {
    const body = (await res.json()) as { code?: unknown; meta?: unknown };
    if (typeof body.code === "string") code = body.code;
    if (body.meta && typeof body.meta === "object") {
      meta = body.meta as Record<string, unknown>;
    }
  } catch {
    // Not JSON (the per-IP rate limiter answers in plain text).
  }

  if (!code) {
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      return {
        code: "RATE_LIMITED",
        meta:
          Number.isFinite(retryAfter) && retryAfter > 0
            ? { retry_after_seconds: retryAfter }
            : null,
      };
    }
    code = res.status >= 500 ? "SERVICE_UNAVAILABLE" : "INVALID_CREDENTIALS";
  }
  return { code, meta };
}

/**
 * The next-auth user for a successful `LoginResponse`, after checking the
 * token's claims. `twoFactor` records that this sign-in used a second
 * factor (so the account has it enabled).
 */
async function userFromLogin(
  body: unknown,
  internalHeaders: Record<string, string>,
  twoFactor: boolean,
): Promise<NextAuthUser | null> {
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { token?: unknown }).token !== "string" ||
    typeof (body as { is_first_login?: unknown }).is_first_login !== "boolean"
  ) {
    console.error("[auth] Unexpected login response format from API");
    return null;
  }

  const login = body as LoginResponseBody;

  let decoded: SetlystJwtPayload;
  try {
    decoded = jwtDecode<SetlystJwtPayload>(login.token);
  } catch {
    console.error("[auth] Failed to decode JWT");
    return null;
  }

  if (!decoded.sub || !decoded.username || !decoded.exp) {
    console.error("[auth] JWT missing required claims");
    return null;
  }

  if (!isValidRole(decoded.role)) {
    console.error("[auth] Invalid role in JWT:", decoded.role);
    return null;
  }

  if (Date.now() >= decoded.exp * 1000) {
    console.error("[auth] Received already-expired JWT");
    return null;
  }

  const mustChangePassword = login.must_change_password === true;

  return {
    id: decoded.sub,
    name: decoded.username,
    role: decoded.role,
    apiToken: login.token,
    isFirstLogin: login.is_first_login,
    mustChangePassword,
    // Older API builds don't send the flags: assume the happy path
    // rather than nagging everyone (the dashboard re-checks /users/me).
    emailVerified: login.email_verified !== false,
    termsAccepted: login.terms_accepted !== false,
    twoFactorEnabled: twoFactor,
    isNewAccount: login.is_new_account === true,
    language: mustChangePassword
      ? null
      : await fetchPreferredLanguage(login.token, internalHeaders),
  };
}

type SessionToken = import("next-auth/jwt").JWT;

/**
 * Asks the API for a read-only token to view the platform as `userId`
 * (`POST /users/{id}/impersonate`), with the staff member's own token.
 * The API decides who may impersonate whom and writes the audit log.
 *
 * Runs here, inside the `jwt` callback, so the token only ever lives in
 * the encrypted session cookie: it never passes through a server action
 * answer, React state or the browser's memory.
 */
async function requestImpersonationToken(
  token: SessionToken,
  userId: string,
): Promise<{ token: string } | { error: string }> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl || !token.apiToken) return { error: "SERVICE_UNAVAILABLE" };
  try {
    const res = await fetch(
      `${apiUrl}/users/${encodeURIComponent(userId)}/impersonate`,
      {
        method: "POST",
        headers: {
          ...(await getInternalApiHeaders()),
          Authorization: `Bearer ${token.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: "{}",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      const { code } = await readApiFailure(res);
      return { error: code };
    }
    const body = (await res.json()) as { token?: unknown };
    return typeof body.token === "string"
      ? { token: body.token }
      : { error: "SERVICE_UNAVAILABLE" };
  } catch {
    return { error: "SERVICE_UNAVAILABLE" };
  }
}

/**
 * Switches the session to a read-only impersonation token issued by the
 * API (see requestImpersonationToken).
 *
 * The token is accepted only if it names *this* session's user as its
 * impersonator and the API accepts it. The staff member's own token is
 * kept aside and restored by `restoreImpersonator`.
 */
async function startImpersonation(
  token: SessionToken,
  impersonationToken: string,
): Promise<SessionToken | null> {
  let decoded: SetlystJwtPayload;
  try {
    decoded = jwtDecode<SetlystJwtPayload>(impersonationToken);
  } catch {
    return null;
  }

  if (!decoded.imp || decoded.imp !== token.id || !isValidRole(decoded.role)) {
    return null;
  }

  const apiUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${apiUrl}/users/me`, {
      headers: {
        ...(await getInternalApiHeaders()),
        Authorization: `Bearer ${impersonationToken}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  return {
    ...token,
    impersonator: {
      id: token.id,
      name: (token.name as string | undefined) ?? "",
      role: token.role,
      apiToken: token.apiToken,
      apiTokenExpires: token.apiTokenExpires,
      emailVerified: token.emailVerified,
      termsAccepted: token.termsAccepted,
      twoFactorEnabled: token.twoFactorEnabled,
    },
    id: decoded.sub,
    name: decoded.username,
    role: decoded.role,
    apiToken: impersonationToken,
    apiTokenExpires: decoded.exp * 1000,
    mustChangePassword: false,
    isFirstLogin: false,
    // Viewing as someone never shows *their* account prompts.
    emailVerified: true,
    termsAccepted: true,
    twoFactorEnabled: undefined,
    impersonationError: undefined,
  };
}

/** Starts impersonating `userId`, or records why it was refused. */
async function impersonate(
  token: SessionToken,
  userId: string,
): Promise<SessionToken> {
  const issued = await requestImpersonationToken(token, userId);
  if ("error" in issued) {
    return { ...token, impersonationError: issued.error };
  }
  const next = await startImpersonation(token, issued.token);
  return next ?? { ...token, impersonationError: "SERVICE_UNAVAILABLE" };
}

function restoreImpersonator(token: SessionToken): SessionToken {
  const original = token.impersonator;
  if (!original) return token;
  return {
    ...token,
    id: original.id,
    name: original.name,
    role: original.role,
    apiToken: original.apiToken,
    apiTokenExpires: original.apiTokenExpires,
    emailVerified: original.emailVerified,
    termsAccepted: original.termsAccepted,
    twoFactorEnabled: original.twoFactorEnabled,
    impersonator: undefined,
    error:
      original.apiTokenExpires && Date.now() > original.apiTokenExpires
        ? "TokenExpired"
        : undefined,
  };
}

// ---------------------------------------------------------------------
// Google sign-in
// ---------------------------------------------------------------------

/** Reads and clears the intent saved before leaving for Google. */
async function takeGoogleIntent(): Promise<GoogleIntent | null> {
  try {
    const store = await cookies();
    const raw = store.get(GOOGLE_INTENT_COOKIE)?.value;
    if (raw) store.delete(GOOGLE_INTENT_COOKIE);
    return parseGoogleIntent(raw, routing.locales, routing.defaultLocale);
  } catch {
    return null;
  }
}

/**
 * Login page URL reporting a failed Google sign-in. The URL names the
 * code only; the details (a suspension's end date and reason, a wait)
 * go in a short-lived httpOnly cookie the login page reads once, so a
 * crafted `?google_error=` link can't put words on the real login page.
 */
async function googleErrorUrl(
  locale: string,
  code: string,
  meta?: Record<string, unknown> | null,
): Promise<string> {
  try {
    (await cookies()).set(
      GOOGLE_ERROR_COOKIE,
      serializeGoogleSignInError(code, meta),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: GOOGLE_ERROR_MAX_AGE,
      },
    );
  } catch {
    // The login page still names the failure from the bare code.
  }
  const params = new URLSearchParams({
    google_error: /^[A-Z_]{1,64}$/.test(code) ? code : "SERVICE_UNAVAILABLE",
  });
  return `/${locale}/login?${params}`;
}

function settingsGoogleUrl(locale: string, status: string): string {
  return `/${locale}/dashboard/settings?google=${status}#security`;
}

/**
 * Exchanges the Google ID token with the API and decides where the
 * browser goes next. Returns `true` after filling `user` with the Setlyst
 * session (the same object reaches the `jwt` callback), or a path to
 * redirect to without signing in.
 */
async function completeGoogleSignIn(
  user: NextAuthUser,
  idToken: string | undefined,
): Promise<true | string> {
  const intent = await takeGoogleIntent();
  const locale = intent?.locale ?? routing.defaultLocale;
  const linking = intent?.mode === "link";

  if (!idToken) return await googleErrorUrl(locale, "INVALID_GOOGLE_TOKEN");

  // Linking happens while signed in and never signs anyone in: the ID
  // token is kept server-side (httpOnly cookie, bound to this account)
  // until the person confirms it's them in the settings, which then sends
  // both to `POST /users/me/identities/google` (lib/actions/security.ts,
  // linkGoogle). Linking through `/auth/oauth/google` instead only works
  // for addresses Google is authoritative for, and not at all with 2FA.
  if (linking) {
    const current = await getSessionToken();
    if (!current?.id || current.impersonator) {
      return settingsGoogleUrl(locale, "failed");
    }
    try {
      (await cookies()).set(
        GOOGLE_LINK_COOKIE,
        serializeGoogleLink(current.id, idToken),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: GOOGLE_LINK_MAX_AGE,
        },
      );
    } catch {
      return settingsGoogleUrl(locale, "failed");
    }
    return settingsGoogleUrl(locale, "confirm");
  }

  const apiUrl = getApiBaseUrl();
  const internalHeaders = await getInternalApiHeaders();

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/auth/oauth/google`, {
      method: "POST",
      headers: { ...internalHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: idToken,
        referral_code: intent?.referralCode ?? undefined,
        accept_terms: intent?.acceptTerms === true,
        // Part of the same consent checkbox; the API needs it to create
        // an account and ignores it for an existing one.
        age_confirmed: intent?.ageConfirmed === true,
        marketing_opt_in: intent?.marketingOptIn === true,
        locale,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(
      "[auth] Google sign-in request failed:",
      (err as Error)?.name,
    );
    return await googleErrorUrl(locale, "SERVICE_UNAVAILABLE");
  }

  if (!res.ok) {
    const { code, meta } = await readApiFailure(res);

    // A new account needs the consent checkbox (terms, privacy and the
    // age declaration) first: the consent page asks, then restarts the
    // Google sign-in with it.
    const needsConsent =
      (code === "TERMS_NOT_ACCEPTED" && meta?.signup === true) ||
      code === "AGE_CONFIRMATION_REQUIRED";
    if (needsConsent) {
      const email = typeof meta?.email === "string" ? meta.email : null;
      const name = typeof meta?.name === "string" ? meta.name : null;
      // Kept server-side for the consent page (no e-mail in the URL).
      if (email || name) {
        try {
          (await cookies()).set(
            GOOGLE_SIGNUP_COOKIE,
            JSON.stringify({ email, name }),
            {
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
              maxAge: GOOGLE_INTENT_MAX_AGE,
            },
          );
        } catch {
          // The consent page still works without the name and e-mail.
        }
      }
      const params = new URLSearchParams();
      if (intent?.referralCode) params.set("ref", intent.referralCode);
      if (intent?.callbackPath) params.set("callbackUrl", intent.callbackPath);
      const query = params.size ? `?${params}` : "";
      return `/${locale}/login/google-consent${query}`;
    }

    return await googleErrorUrl(locale, code, meta);
  }

  const body: unknown = await res.json().catch(() => null);

  if ((body as { two_factor_required?: unknown })?.two_factor_required) {
    const challenge = body as {
      challenge_token?: unknown;
      challenge_expires_at?: unknown;
    };
    if (typeof challenge.challenge_token !== "string") {
      return await googleErrorUrl(locale, "SERVICE_UNAVAILABLE");
    }
    // Handed to the login page in an httpOnly cookie, never in the URL,
    // so the token can't end up in access logs or analytics.
    const expiresAt =
      typeof challenge.challenge_expires_at === "string"
        ? challenge.challenge_expires_at
        : null;
    try {
      (await cookies()).set(
        GOOGLE_2FA_COOKIE,
        serializeGoogleTwoFactor({
          token: challenge.challenge_token,
          expiresAt,
          callbackPath: intent?.callbackPath ?? null,
        }),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: googleTwoFactorMaxAge(expiresAt),
        },
      );
    } catch {
      return await googleErrorUrl(locale, "SERVICE_UNAVAILABLE");
    }
    return `/${locale}/login?step=2fa`;
  }

  const account = await userFromLogin(body, internalHeaders, false);
  if (!account) return await googleErrorUrl(locale, "SERVICE_UNAVAILABLE");

  // The Google profile object becomes the Setlyst user (next-auth passes
  // this very object to the `jwt` callback). Google's picture and e-mail
  // are not kept in the session.
  Object.assign(user, account, { email: null, image: null });
  return true;
}

// ---------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------

function googleProviders() {
  if (!isGoogleSignInEnabled()) return [];
  return [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      authorization: { params: { prompt: "select_account" } },
    }),
  ];
}

/** How long a sign-in waits for the API before giving up. */
const LOGIN_TIMEOUT_MS = 25_000;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        challengeToken: { label: "Challenge", type: "text" },
        code: { label: "Code", type: "text" },
        recoveryCode: { label: "Recovery code", type: "text" },
      },
      async authorize(credentials, req) {
        const challengeToken = credentials?.challengeToken?.trim();
        const secondStep = Boolean(challengeToken);

        if (secondStep) {
          const code = credentials?.code?.trim();
          const recoveryCode = credentials?.recoveryCode?.trim();
          if (
            !challengeToken ||
            challengeToken.length > 128 ||
            (!code && !recoveryCode) ||
            (code && !/^\d{6}$/.test(code)) ||
            (recoveryCode && recoveryCode.length > 16)
          ) {
            throw signInError("INVALID_TWO_FACTOR_CODE");
          }
        } else {
          if (!credentials?.username || !credentials?.password) return null;
          if (
            credentials.username.length > 254 ||
            credentials.password.length > 256
          ) {
            return null;
          }
        }

        const apiUrl = getApiBaseUrl();

        if (!apiUrl) {
          console.error("[auth] API URL is not configured");
          return null;
        }

        // Identifies the visitor to the API's rate limiter and lockout
        // logic; without it every web login shares this server's address.
        const internalHeaders = await getInternalApiHeaders(
          headersFromRecord(req?.headers),
        );

        try {
          const res = secondStep
            ? await fetch(`${apiUrl}/auth/login/2fa`, {
                method: "POST",
                headers: {
                  ...internalHeaders,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  challenge_token: challengeToken,
                  code: credentials?.code?.trim() || undefined,
                  recovery_code: credentials?.code?.trim()
                    ? undefined
                    : credentials?.recoveryCode?.trim() || undefined,
                }),
                redirect: "error",
                // A sleeping or overloaded API must not hang the sign-in.
                signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
              })
            : await fetch(`${apiUrl}/auth/login`, {
                method: "POST",
                headers: {
                  ...internalHeaders,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  username: credentials!.username.trim(),
                  password: credentials!.password,
                }),
                redirect: "error",
                // A sleeping or overloaded API must not hang the sign-in.
                signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
              });

          if (!res.ok) {
            const { code, meta } = await readApiFailure(res);
            throw signInError(code, meta);
          }

          const body: unknown = await res.json();

          if (
            !secondStep &&
            (body as { two_factor_required?: unknown })?.two_factor_required ===
              true
          ) {
            const challenge = body as {
              challenge_token?: unknown;
              challenge_expires_at?: unknown;
            };
            if (typeof challenge.challenge_token !== "string") {
              throw signInError("SERVICE_UNAVAILABLE");
            }
            throw signInError("TWO_FACTOR_REQUIRED", {
              challenge_token: challenge.challenge_token,
              challenge_expires_at:
                typeof challenge.challenge_expires_at === "string"
                  ? challenge.challenge_expires_at
                  : null,
            });
          }

          return await userFromLogin(body, internalHeaders, secondStep);
        } catch (err) {
          // Our own, already-classified failures pass straight through.
          if (err instanceof Error && err.message.startsWith("{")) throw err;
          console.error(
            "[auth] Authentication request failed:",
            (err as Error)?.name,
          );
          throw signInError("SERVICE_UNAVAILABLE");
        }
      },
    }),
    ...googleProviders(),
  ],
  callbacks: {
    // Only this app's own pages, never `//host` or another origin, whatever
    // `callbackUrl` a link or a form carried.
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      return completeGoogleSignIn(
        user as NextAuthUser,
        account.id_token ?? undefined,
      );
    },
    async jwt({ token, user, trigger, session }) {
      // Reported once, by the update that tried: the next read drops it.
      if (token.impersonationError) token.impersonationError = undefined;

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = null;
        token.picture = null;
        token.role = user.role;
        token.apiToken = user.apiToken;
        token.isFirstLogin = user.isFirstLogin;
        token.mustChangePassword = user.mustChangePassword === true;
        token.language = user.language ?? undefined;
        token.emailVerified = user.emailVerified !== false;
        token.termsAccepted = user.termsAccepted !== false;
        token.twoFactorEnabled = user.twoFactorEnabled === true;
        token.impersonator = undefined;
        token.error = undefined;

        try {
          const decoded = jwtDecode<SetlystJwtPayload>(user.apiToken as string);
          token.apiTokenExpires = decoded.exp * 1000;
        } catch {
          return { ...token, error: "TokenExpired" };
        }
      }

      if (trigger === "update") {
        const update = (session ?? {}) as {
          language?: unknown;
          impersonateUserId?: unknown;
          stopImpersonation?: unknown;
          refreshAccount?: unknown;
        };

        // Keeps the token's copy of the language in step when it's changed
        // from the settings page in this same session, so a later launch
        // that resolves the locale from the token (see proxy.ts) doesn't
        // send the person back to the language they just moved away from.
        if (isSupportedLocale(update.language)) {
          token.language = update.language;
        }

        // After verifying the e-mail, accepting the terms or changing
        // two-factor: the flags are re-read from the API, never taken from
        // the client.
        if (
          update.refreshAccount === true &&
          !token.impersonator &&
          token.apiToken
        ) {
          const flags = await fetchAccountFlags(token.apiToken);
          if (flags) {
            token.emailVerified = flags.emailVerified;
            token.termsAccepted = flags.termsAccepted;
            token.twoFactorEnabled = flags.twoFactorEnabled;
          }
        }

        // "View as": the client names the account, the token is fetched
        // here with the staff member's own credentials (see
        // requestImpersonationToken). Never nested, never from an expired
        // session.
        if (update.impersonateUserId !== undefined) {
          if (
            !isUuid(update.impersonateUserId) ||
            token.impersonator ||
            token.error === "TokenExpired" ||
            !isValidRole(token.role) ||
            token.role === "user"
          ) {
            return { ...token, impersonationError: "FORBIDDEN" };
          }
          return impersonate(token, update.impersonateUserId);
        }

        if (update.stopImpersonation === true && token.impersonator) {
          return restoreImpersonator(token);
        }
      }

      if (
        token.apiTokenExpires &&
        Date.now() > (token.apiTokenExpires as number)
      ) {
        // An expired *impersonation* ends the impersonation, not the
        // staff member's own session.
        if (token.impersonator) return restoreImpersonator(token);
        return { ...token, error: "TokenExpired" };
      }

      return token;
    },
    // The API token deliberately stays out of the session object: that is
    // what `/api/auth/session` hands to the browser. Server code reads it
    // from the encrypted JWT with `getApiToken()` (lib/server/api-token.ts).
    async session({ session, token }) {
      if (token.error === "TokenExpired") {
        session.error = "TokenExpired";
      }
      if (token.impersonationError) {
        session.impersonationError = token.impersonationError;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.name =
          (token.name as string | undefined) ?? session.user.name;
        session.user.email = null;
        session.user.image = null;
        session.user.role = token.role as ValidRole;
        session.user.isFirstLogin = token.isFirstLogin;
        session.user.mustChangePassword = token.mustChangePassword === true;
        session.user.language = token.language;
        session.user.emailVerified = token.emailVerified !== false;
        session.user.termsAccepted = token.termsAccepted !== false;
        session.user.twoFactorEnabled = token.twoFactorEnabled;
        session.user.impersonator = token.impersonator
          ? {
              id: token.impersonator.id,
              name: token.impersonator.name,
              role: token.impersonator.role,
            }
          : undefined;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
    updateAge: 60 * 60, // refresh session cookie every 1h
  },
  pages: {
    signIn: "/login",
    // OAuth failures (cancelled at Google, expired state...) land on the
    // login page with `?error=`, which explains them.
    error: "/login",
  },
  debug: false,
};
