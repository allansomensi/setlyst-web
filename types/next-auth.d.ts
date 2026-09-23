import { DefaultSession, DefaultUser } from "next-auth";

type PlatformRole = "user" | "moderator" | "admin";

declare module "next-auth" {
  interface Session {
    error?: "TokenExpired";
    user: {
      id: string;
      role: PlatformRole;
      isFirstLogin?: boolean;
      /**
       * The account must choose a new password before anything else (a
       * temporary password, or one below the current policy). The proxy
       * keeps it on the change-password screen until then.
       */
      mustChangePassword?: boolean;
      /** The account's saved interface language — see lib/auth.ts. */
      language?: string;
      /**
       * The account's e-mail address is verified. Drives the dashboard's
       * verification banner; refreshed with `update({ refreshAccount: true })`.
       */
      emailVerified: boolean;
      /** The Terms of Use in force (`LEGAL_VERSION`) were accepted. */
      termsAccepted: boolean;
      /** Two-factor authentication is on (as of sign-in or last refresh). */
      twoFactorEnabled?: boolean;
      /**
       * Set while a staff member is viewing the platform as this user
       * (read-only). Identifies who to switch back to.
       */
      impersonator?: { id: string; name: string; role: PlatformRole };
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: PlatformRole;
    apiToken: string;
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
    /**
     * Read from the API at sign-in so the very first launch on a new
     * device can open in the right language, before any cookie exists.
     * Null when the lookup failed — locale detection then falls back to
     * the `Accept-Language` header as it always did.
     */
    language?: string | null;
    emailVerified?: boolean;
    termsAccepted?: boolean;
    twoFactorEnabled?: boolean;
    /** This sign-in created the account (Google sign-up). */
    isNewAccount?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: PlatformRole;
    apiToken: string;
    apiTokenExpires?: number;
    error?: "TokenExpired";
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
    language?: string;
    emailVerified?: boolean;
    termsAccepted?: boolean;
    twoFactorEnabled?: boolean;
    /** The staff member's own session, kept aside while impersonating. */
    impersonator?: {
      id: string;
      name: string;
      role: PlatformRole;
      apiToken: string;
      apiTokenExpires?: number;
      emailVerified?: boolean;
      termsAccepted?: boolean;
      twoFactorEnabled?: boolean;
    };
  }
}
