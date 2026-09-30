import { getTranslations } from "next-intl/server";
import { Check, Minus } from "lucide-react";
import { pickLocalized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { isUnlimited } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { PLAN_FEATURES, PLAN_LIMITS, type PublicPlan } from "@/types/public";

/**
 * Side-by-side comparison of every limit and feature of the public plans.
 * On a phone the three plans fit next to the row labels (tighter cells,
 * smaller type): scrolling sideways with one plan in view at a time
 * defeated the point of a comparison. It still scrolls, with the labels
 * pinned, if a translation ever makes it wider than the screen. From
 * `lg` up the plan names stay pinned under the site header while the
 * long table scrolls by.
 */
export async function PlanComparison({
  plans,
  locale,
}: {
  plans: PublicPlan[];
  locale: string;
}) {
  const t = await getTranslations("pricing");
  const number = new Intl.NumberFormat(locale);

  const yes = (
    <>
      <Check aria-hidden className="text-primary mx-auto size-5" />
      <span className="sr-only">{t("included")}</span>
    </>
  );
  const no = (
    <>
      <Minus aria-hidden className="text-muted-foreground/60 mx-auto size-5" />
      <span className="sr-only">{t("notIncluded")}</span>
    </>
  );

  const limitRows = PLAN_LIMITS.filter((key) =>
    plans.some((plan) => key in plan.limits),
  );

  // The recommended plan's column is tinted so the eye can follow it
  // down the table. Opaque (mixed into the card colour) because the
  // header cells are sticky and must hide the rows passing under them.
  const columnTint = (plan: PublicPlan) =>
    plan.highlighted &&
    "bg-[color-mix(in_oklch,var(--primary)_5%,var(--card))]";

  const groupHeader = (label: string) => (
    <tr>
      <th
        scope="colgroup"
        colSpan={plans.length + 1}
        className="bg-muted/60 px-3 py-2.5 text-left text-xs font-semibold tracking-wider uppercase sm:px-4"
      >
        {label}
      </th>
    </tr>
  );

  return (
    // Focusable so the table can be scrolled sideways from the keyboard.
    <div
      role="region"
      aria-label={t("compareTitle")}
      tabIndex={0}
      className="bg-card focus-visible:ring-ring/50 relative overflow-x-auto rounded-2xl border outline-none focus-visible:ring-3 lg:overflow-visible"
    >
      <table className="w-full min-w-[20rem] border-collapse text-[0.8125rem] sm:min-w-[40rem] sm:text-sm">
        <caption className="sr-only">{t("compareTitle")}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="bg-card sticky left-0 w-[33%] rounded-tl-2xl px-3 py-3 text-left font-medium shadow-[inset_0_-1px_0_var(--border)] sm:w-[40%] sm:px-4 sm:py-4 lg:top-16 lg:z-10"
            >
              <span className="sr-only">{t("resource")}</span>
            </th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                scope="col"
                className={cn(
                  "bg-card px-1.5 py-3 text-center align-bottom shadow-[inset_0_-1px_0_var(--border)] last:rounded-tr-2xl sm:px-4 sm:py-4 lg:sticky lg:top-16 lg:z-10",
                  columnTint(plan),
                )}
              >
                <span
                  className={cn(
                    "block text-[0.8125rem] font-semibold sm:text-base",
                    plan.highlighted && "text-primary",
                  )}
                >
                  {pickLocalized(plan.name, locale) || plan.code}
                </span>
                {/* Prices from `sm` up: on a phone they would push the
                    third plan off screen, and the cards just above show
                    them. */}
                <span className="text-muted-foreground mt-0.5 hidden text-xs font-normal tabular-nums sm:block">
                  {plan.price_monthly_cents > 0
                    ? `${formatMoney(plan.price_monthly_cents, plan.currency, locale)}${t("per.monthly")}`
                    : t("free")}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {/* The outer corners of the last row follow the container's: it no
            longer clips its content from `lg` up (for the sticky header). */}
        <tbody className="[&>tr:last-child>*:first-child]:rounded-bl-2xl [&>tr:last-child>*:last-child]:rounded-br-2xl">
          {groupHeader(t("limitsGroup"))}
          {limitRows.map((key) => (
            <tr key={key} className="border-t">
              <th
                scope="row"
                className="bg-card sticky left-0 px-3 py-3 text-left font-normal sm:px-4"
              >
                {t(`limits.${key}`)}
              </th>
              {plans.map((plan) => {
                const value = plan.limits[key] ?? 0;
                return (
                  <td
                    key={plan.code}
                    className={cn(
                      "px-1.5 py-3 text-center tabular-nums sm:px-4",
                      columnTint(plan),
                    )}
                  >
                    {value <= 0
                      ? no
                      : isUnlimited(value)
                        ? t("unlimited")
                        : number.format(value)}
                  </td>
                );
              })}
            </tr>
          ))}
          {groupHeader(t("featuresGroup"))}
          {PLAN_FEATURES.map((key) => (
            <tr key={key} className="border-t">
              <th
                scope="row"
                className="bg-card sticky left-0 px-3 py-3 text-left font-normal sm:px-4"
              >
                {t(`features.${key}`)}
              </th>
              {plans.map((plan) => (
                <td
                  key={plan.code}
                  className={cn(
                    "px-1.5 py-3 text-center sm:px-4",
                    columnTint(plan),
                  )}
                >
                  {plan.features[key] ? yes : no}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
