/**
 * Pure helpers for the billing screens of the staff console: money entry
 * in reais, promo code generation and the status of codes and promotions.
 */

import { parseApiTimestamp } from "@/lib/dates";
import type { PromoCode, PromoKind, Promotion } from "@/types/staff";

/**
 * A price typed in reais ("14,90", "14.90", "1.490,00", "R$ 9") as cents.
 * Returns `null` for anything that isn't a non-negative amount with at
 * most two decimals.
 */
export function reaisToCents(input: string): number | null {
  let value = input.replace(/R\$|\s/g, "");
  if (!value) return null;
  // "1.490,00" (pt-BR) → "1490.00"; "1,490.00" (en) → "1490.00".
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma > lastDot) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    value = value.replace(/,/g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** Cents as an editable amount in reais with a decimal comma ("14,90"). */
export function centsToReais(cents: number): string {
  const safe = Math.max(0, Math.round(cents));
  return `${Math.floor(safe / 100)},${String(safe % 100).padStart(2, "0")}`;
}

/** Unambiguous characters (no 0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * A random promo code like `SETLYST-7KQ4-M2XP` (`prefix` optional,
 * 4..32 characters of letters, digits and `-` as the API requires).
 */
export function generatePromoCode(
  prefix = "",
  random: (max: number) => number = secureRandomInt,
): string {
  const block = () =>
    Array.from(
      { length: 4 },
      () => CODE_ALPHABET[random(CODE_ALPHABET.length)],
    ).join("");
  const cleanPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 16);
  return [cleanPrefix, block(), block()].filter(Boolean).join("-");
}

function secureRandomInt(max: number): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] % max;
}

export const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;

/** Which value fields a promo kind requires (the others must be empty). */
export const PROMO_KIND_FIELDS: Record<
  PromoKind,
  { plan: boolean; days: boolean; credits: boolean; discount: boolean }
> = {
  plan_grant: { plan: true, days: true, credits: false, discount: false },
  trial_extension: { plan: false, days: true, credits: false, discount: false },
  credits: { plan: false, days: false, credits: true, discount: false },
  discount: { plan: false, days: false, credits: false, discount: true },
};

export type PromoCodeStatus =
  "active" | "scheduled" | "expired" | "exhausted" | "disabled";

export function promoCodeStatus(
  promo: Pick<
    PromoCode,
    | "disabled_at"
    | "starts_at"
    | "expires_at"
    | "max_redemptions"
    | "redemptions_count"
  >,
  now: Date = new Date(),
): PromoCodeStatus {
  const time = now.getTime();
  if (promo.disabled_at) return "disabled";
  if (
    promo.expires_at &&
    parseApiTimestamp(promo.expires_at).getTime() <= time
  ) {
    return "expired";
  }
  if (
    promo.max_redemptions !== null &&
    promo.redemptions_count >= promo.max_redemptions
  ) {
    return "exhausted";
  }
  if (promo.starts_at && parseApiTimestamp(promo.starts_at).getTime() > time) {
    return "scheduled";
  }
  return "active";
}

export type PromotionStatus = "running" | "scheduled" | "ended" | "inactive";

export function promotionStatus(
  promotion: Pick<Promotion, "active" | "starts_at" | "ends_at">,
  now: Date = new Date(),
): PromotionStatus {
  if (!promotion.active) return "inactive";
  const time = now.getTime();
  if (parseApiTimestamp(promotion.ends_at).getTime() <= time) return "ended";
  if (parseApiTimestamp(promotion.starts_at).getTime() > time)
    return "scheduled";
  return "running";
}

export const STATUS_TONES: Record<PromoCodeStatus | PromotionStatus, string> = {
  active:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  running:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  scheduled: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  expired: "border-border bg-muted text-muted-foreground",
  ended: "border-border bg-muted text-muted-foreground",
  exhausted:
    "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  disabled: "border-border bg-muted text-muted-foreground",
  inactive: "border-border bg-muted text-muted-foreground",
};
