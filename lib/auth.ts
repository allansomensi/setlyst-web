import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";
import { routing } from "@/i18n/routing";

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

/**
 * Sign-in failures are reported to the login page as a JSON-encoded
 * `Error` message (NextAuth forwards it as `signIn()`'s `error`), so the
 * page can show the exact reason — suspension end date included — in the
 * user's language. See `parseSignInError` in lib/sign-in-errors.ts.
 */
function signInError(
  code: string,
  meta?: Record<string, unknown> | null,
): Error {
  return new Error(JSON.stringify({ code, meta: meta ?? null }));
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
 * has never been used before — a freshly installed PWA, a new phone, a
 * cleared browser. Locale resolution otherwise has only the URL, the
 * `NEXT_LOCALE` cookie and the `Accept-Language` header to go on, and on
 * a first launch the first two don't exist yet: the app would come up in
 * whatever language the *browser* is set to and ignore the account
 * preference entirely. Carrying the preference in the session token gives
 * `proxy.ts` something authoritative to redirect with (see
 * `resolvePreferredLocale` there).
 *
 * Best-effort by design: preferences are cosmetic, so a slow or failing
 * call here must never turn a valid sign-in into a failed one. On failure
 * the app simply falls back to header/default detection, exactly as before.
 */
async function fetchPreferredLanguage(
  apiToken: string,
): Promise<string | null> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/users/me/preferences`, {
      headers: {
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

type SessionToken = import("next-auth/jwt").JWT;

/**
 * Switches the session to a read-only impersonation token issued by the
 * API (`POST /users/{id}/impersonate`, called from a server action).
 *
 * The token is accepted only if it names *this* session's user as its
 * impersonator and the API accepts it — so a client can't smuggle in an
 * arbitrary token through `useSession().update()`. The staff member's own
 * token is kept aside and restored by `restoreImpersonator`.
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
    },
    id: decoded.sub,
    name: decoded.username,
    role: decoded.role,
    apiToken: impersonationToken,
    apiTokenExpires: decoded.exp * 1000,
    mustChangePassword: false,
    isFirstLogin: false,
  };
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
    impersonator: undefined,
    error:
      original.apiTokenExpires && Date.now() > original.apiTokenExpires
        ? "TokenExpired"
        : undefined,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        if (
          credentials.username.length > 128 ||
          credentials.password.length > 256
        ) {
          return null;
        }

        const apiUrl = getApiBaseUrl();

        if (!apiUrl) {
          console.error("[auth] API URL is not configured");
          return null;
        }

        try {
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
            redirect: "error",
          });

          if (!res.ok) {
            if (res.status === 429) throw signInError("RATE_LIMITED");
            let code =
              res.status >= 500 ? "SERVICE_UNAVAILABLE" : "INVALID_CREDENTIALS";
            let meta: Record<string, unknown> | null = null;
            try {
              const errorBody = (await res.json()) as {
                code?: unknown;
                meta?: unknown;
              };
              if (typeof errorBody.code === "string") code = errorBody.code;
              if (errorBody.meta && typeof errorBody.meta === "object") {
                meta = errorBody.meta as Record<string, unknown>;
              }
            } catch {
              // Not JSON: keep the status-derived code.
            }
            throw signInError(code, meta);
          }

          const body: unknown = await res.json();

          if (
            typeof body !== "object" ||
            body === null ||
            typeof (body as { token?: unknown }).token !== "string" ||
            typeof (body as { is_first_login?: unknown }).is_first_login !==
              "boolean"
          ) {
            console.error("[auth] Unexpected login response format from API");
            return null;
          }

          const {
            token,
            is_first_login: isFirstLogin,
            must_change_password: mustChangePassword,
          } = body as {
            token: string;
            is_first_login: boolean;
            must_change_password?: boolean;
          };

          let decoded: SetlystJwtPayload;
          try {
            decoded = jwtDecode<SetlystJwtPayload>(token);
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

          return {
            id: decoded.sub,
            name: decoded.username,
            role: decoded.role,
            apiToken: token,
            isFirstLogin,
            mustChangePassword: mustChangePassword === true,
            language: mustChangePassword
              ? null
              : await fetchPreferredLanguage(token),
          };
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
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.apiToken = user.apiToken;
        token.isFirstLogin = user.isFirstLogin;
        token.mustChangePassword = user.mustChangePassword === true;
        token.language = user.language ?? undefined;
        token.impersonator = undefined;

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
          impersonationToken?: unknown;
          stopImpersonation?: unknown;
        };

        // Keeps the token's copy of the language in step when it's changed
        // from the settings page in this same session, so a later launch
        // that resolves the locale from the token (see proxy.ts) doesn't
        // send the person back to the language they just moved away from.
        if (isSupportedLocale(update.language)) {
          token.language = update.language;
        }

        if (
          typeof update.impersonationToken === "string" &&
          !token.impersonator
        ) {
          const next = await startImpersonation(
            token,
            update.impersonationToken,
          );
          if (next) return next;
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
    async session({ session, token }) {
      if (token.error === "TokenExpired") {
        session.error = "TokenExpired";
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.name =
          (token.name as string | undefined) ?? session.user.name;
        session.user.role = token.role as ValidRole;
        session.user.apiToken = token.apiToken as string;
        session.user.isFirstLogin = token.isFirstLogin;
        session.user.mustChangePassword = token.mustChangePassword === true;
        session.user.language = token.language;
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
  },
  debug: false,
};
