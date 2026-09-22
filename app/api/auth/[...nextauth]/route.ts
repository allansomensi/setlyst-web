import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// A Route Handler file may only export the HTTP verbs (plus a small set of
// route config values). `authOptions` lives in lib/auth.ts instead of here
// so the ~8 server components and helpers that need it can import it
// without pulling a route module — and without tripping Next.js' route
// export validation.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
