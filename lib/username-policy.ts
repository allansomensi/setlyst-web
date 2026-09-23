/**
 * Username rules, mirrored from the API
 * (`setlyst-api/src/validations/username.rs`) for instant feedback in
 * forms. The API re-validates everything.
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

export type UsernameIssue =
  "length" | "characters" | "start" | "end" | "consecutive" | "reserved";

const SEPARATORS = new Set([".", "_", "-"]);

const RESERVED = new Set([
  "admin",
  "administrator",
  "administrador",
  "root",
  "system",
  "sistema",
  "support",
  "suporte",
  "soporte",
  "help",
  "ajuda",
  "ayuda",
  "moderator",
  "moderador",
  "mod",
  "staff",
  "official",
  "oficial",
  "team",
  "equipe",
  "security",
  "seguranca",
  "api",
  "www",
  "mail",
  "null",
  "undefined",
  "anonymous",
  "me",
  "settings",
  "login",
  "logout",
  "register",
  "signup",
  "dashboard",
  "status",
  "about",
  "legal",
  "privacy",
  "terms",
  "wiki",
  "setlyst",
]);

/** The first rule `username` breaks, or `null` when it's valid. */
export function usernameIssue(username: string): UsernameIssue | null {
  const length = Array.from(username).length;
  if (length < MIN_USERNAME_LENGTH || length > MAX_USERNAME_LENGTH) {
    return "length";
  }
  if (!/^[A-Za-z0-9._-]+$/.test(username)) return "characters";
  if (!/^[A-Za-z]/.test(username)) return "start";
  if (!/[A-Za-z0-9]$/.test(username)) return "end";

  let previousWasSeparator = false;
  for (const c of username) {
    const isSeparator = SEPARATORS.has(c);
    if (isSeparator && previousWasSeparator) return "consecutive";
    previousWasSeparator = isSeparator;
  }

  const normalized = username.replace(/[._-]/g, "").toLowerCase();
  if (RESERVED.has(normalized) || normalized.startsWith("setlyst")) {
    return "reserved";
  }

  return null;
}

export function isValidUsername(username: string): boolean {
  return usernameIssue(username) === null;
}
