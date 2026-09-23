import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Whether the visitor of a public page has a usable session, to swap
 * "Entrar / Criar conta" for "Ir para o painel". Never throws: a broken
 * or expired session simply reads as signed out.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    return Boolean(session?.user) && session?.error !== "TokenExpired";
  } catch {
    return false;
  }
}
