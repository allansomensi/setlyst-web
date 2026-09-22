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
            return null;
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

          const { token, is_first_login: isFirstLogin } = body as {
            token: string;
            is_first_login: boolean;
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
            language: await fetchPreferredLanguage(token),
          };
        } catch (err) {
          console.error(
            "[auth] Authentication request failed:",
            (err as Error)?.name,
          );
          return null;
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
        token.language = user.language ?? undefined;

        try {
          const decoded = jwtDecode<SetlystJwtPayload>(user.apiToken as string);
          token.apiTokenExpires = decoded.exp * 1000;
        } catch {
          return { ...token, error: "TokenExpired" };
        }
      }

      // Keeps the token's copy of the language in step when it's changed
      // from the settings page in this same session, so a later launch
      // that resolves the locale from the token (see proxy.ts) doesn't
      // send the person back to the language they just moved away from.
      if (trigger === "update") {
        const next = (session as { language?: unknown } | undefined)?.language;
        if (isSupportedLocale(next)) {
          token.language = next;
        }
      }

      if (
        token.apiTokenExpires &&
        Date.now() > (token.apiTokenExpires as number)
      ) {
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
        session.user.role = token.role as ValidRole;
        session.user.apiToken = token.apiToken as string;
        session.user.isFirstLogin = token.isFirstLogin;
        session.user.language = token.language;
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
