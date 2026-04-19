import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtDecode } from "jwt-decode";

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

export const authOptions: NextAuthOptions = {
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

        const apiUrl = (
          process.env.API_URL ??
          process.env.NEXT_PUBLIC_API_URL ??
          ""
        ).replace(/\/$/, "");

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

          const token: unknown = await res.json();

          if (typeof token !== "string") {
            console.error("[auth] Unexpected token format from API");
            return null;
          }

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.apiToken = user.apiToken;

        try {
          const decoded = jwtDecode<SetlystJwtPayload>(user.apiToken as string);
          token.apiTokenExpires = decoded.exp * 1000;
        } catch {
          return { ...token, error: "TokenExpired" };
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
