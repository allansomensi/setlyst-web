import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    error?: "TokenExpired";
    user: {
      id: string;
      role: string;
      apiToken: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    apiToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    apiToken: string;
    apiTokenExpires?: number;
    error?: "TokenExpired";
  }
}
