import "server-only";
import { getSession } from "@/lib/server/session";

/**
 * Whether the visitor of a public page has a usable session, to swap
 * "Entrar / Criar conta" for "Ir para o painel". Never throws: a broken
 * or expired session simply reads as signed out.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const session = await getSession();
    return Boolean(session?.user) && session?.error !== "TokenExpired";
  } catch {
    return false;
  }
}
