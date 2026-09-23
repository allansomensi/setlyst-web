import { getTranslations } from "next-intl/server";
import { Check, Minus } from "lucide-react";
import { pickLocalized } from "@/lib/localized";
import { isUnlimited } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { PLAN_FEATURES, PLAN_LIMITS, type PublicPlan } from "@/types/public";

/**
 * Side-by-side comparison of every limit and feature of the public plans.
 * Scrolls horizontally on small screens with the row labels pinned.
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

  const groupHeader = (label: string) => (
    <tr className="bg-muted/60">
      <th
        scope="colgroup"
        colSpan={plans.length + 1}
        className="bg-muted/60 sticky left-0 px-4 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
      >
        {label}
      </th>
    </tr>
  );

  return (
    <div className="bg-card relative overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">{t("compareTitle")}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="bg-card sticky left-0 w-[40%] px-4 py-4 text-left font-medium"
            >
              <span className="sr-only">{t("resource")}</span>
            </th>
            {plans.map((plan) => (
              <th
                key={plan.code}
                scope="col"
                className={cn(
                  "px-4 py-4 text-center text-base font-semibold",
                  plan.highlighted && "text-primary",
                )}
              >
                {pickLocalized(plan.name, locale) || plan.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groupHeader(t("limitsGroup"))}
          {limitRows.map((key) => (
            <tr key={key} className="border-t">
              <th
                scope="row"
                className="bg-card sticky left-0 px-4 py-3 text-left font-normal"
              >
                {t(`limits.${key}`)}
              </th>
              {plans.map((plan) => {
                const value = plan.limits[key] ?? 0;
                return (
                  <td
                    key={plan.code}
                    className="px-4 py-3 text-center tabular-nums"
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
                className="bg-card sticky left-0 px-4 py-3 text-left font-normal"
              >
                {t(`features.${key}`)}
              </th>
              {plans.map((plan) => (
                <td key={plan.code} className="px-4 py-3 text-center">
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
