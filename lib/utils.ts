import { parseApiTimestamp } from "@/lib/dates";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(
  totalSeconds: number | null | undefined,
): string {
  if (!totalSeconds) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Strips anything that isn't a digit or a colon, and caps at one colon and
 * two digits after it (mm:ss) — used as an input's onChange filter so
 * invalid characters simply can't be typed, instead of only being caught
 * on submit.
 */
export function sanitizeDurationInput(value: string): string {
  const cleaned = value.replace(/[^\d:]/g, "");
  const firstColon = cleaned.indexOf(":");

  if (firstColon === -1) {
    return cleaned.slice(0, 3);
  }

  const minutes = cleaned.slice(0, firstColon).slice(0, 3);
  const seconds = cleaned
    .slice(firstColon + 1)
    .replace(/:/g, "")
    .slice(0, 2);
  return `${minutes}:${seconds}`;
}

/**
 * Whether a (possibly partial, possibly empty) duration string is
 * acceptable to submit. Empty is valid — duration is optional. A value is
 * only valid once it's a complete mm:ss with seconds under 60; anything
 * else (still being typed, or malformed) is not.
 */
export function isValidDurationInput(value: string): boolean {
  if (!value) return true;
  const match = value.match(/^(\d{1,3}):(\d{2})$/);
  if (!match) return false;
  const seconds = Number(match[2]);
  return seconds < 60;
}

export function parseDurationToSeconds(duration: string | null): number | null {
  if (!duration || !duration.includes(":")) return null;

  const parts = duration.split(":");

  if (parts.length !== 2) return null;

  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }

  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

const USERNAME_COOLDOWN_DAYS = 90;

/**
 * Plain helper (not a component) so `Date.now()` here doesn't trip the
 * react-hooks/purity rule, which flags impure calls inside component
 * function bodies — including Server Components — but not inside a
 * regular function a component merely calls.
 */
export function getUsernameCooldownInfo(
  usernameChangedAt: string | null,
  locale: string,
): { inCooldown: boolean; cooldownDate: string | null } {
  const cooldownUntil = usernameChangedAt
    ? new Date(
        parseApiTimestamp(usernameChangedAt).getTime() +
          USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
      )
    : null;

  const inCooldown = !!cooldownUntil && cooldownUntil.getTime() > Date.now();
  const cooldownDate = cooldownUntil
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
        cooldownUntil,
      )
    : null;

  return { inCooldown, cooldownDate };
}
