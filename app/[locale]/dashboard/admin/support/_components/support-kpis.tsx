import { getFormatter, getTranslations } from "next-intl/server";
import { Kpi, KpiGrid } from "@/components/staff/kpi-grid";
import { Link } from "@/i18n/routing";
import { roundRating, splitMinutes } from "@/lib/support-admin";
import type { SupportSummary } from "@/types/operations";

const BASE = "/dashboard/admin/support";

/** A headline number that opens the inbox narrowed to what it counts. */
function KpiLink({ href, value }: { href: string; value: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="focus-visible:ring-ring/50 rounded-sm hover:underline focus-visible:ring-3 focus-visible:outline-none"
    >
      {value}
    </Link>
  );
}

/**
 * The inbox's headline numbers: what's waiting on whom, what nobody has
 * picked up, what's urgent and what's mine, plus how the desk is doing
 * (satisfaction over 90 days, median first response over 30).
 */
export async function SupportKpis({ summary }: { summary: SupportSummary }) {
  const t = await getTranslations("supportAdmin.kpis");
  const tDuration = await getTranslations("supportAdmin.duration");
  const format = await getFormatter();

  const rating = roundRating(summary.average_rating);
  const response =
    summary.median_first_response_minutes === null
      ? null
      : splitMinutes(summary.median_first_response_minutes);

  return (
    <KpiGrid>
      <Kpi
        label={t("open")}
        value={<KpiLink href={`${BASE}?status=open`} value={summary.open} />}
        hint={t("openHint")}
        tone={
          summary.open > 0 ? "text-amber-700 dark:text-amber-300" : undefined
        }
      />
      <Kpi
        label={t("pending")}
        value={
          <KpiLink href={`${BASE}?status=pending`} value={summary.pending} />
        }
        hint={t("pendingHint")}
      />
      <Kpi
        label={t("unassigned")}
        value={
          <KpiLink
            href={`${BASE}?status=open&assignee=none`}
            value={summary.unassigned}
          />
        }
        hint={t("unassignedHint")}
      />
      <Kpi
        label={t("urgent")}
        value={
          <KpiLink href={`${BASE}?priority=urgent`} value={summary.urgent} />
        }
        hint={t("urgentHint")}
        tone={summary.urgent > 0 ? "text-destructive" : undefined}
      />
      <Kpi
        label={t("mine")}
        value={<KpiLink href={`${BASE}?assignee=me`} value={summary.mine} />}
        hint={t("mineHint")}
      />
      <Kpi
        label={t("rating")}
        value={
          rating === null
            ? "—"
            : t("ratingValue", {
                rating: format.number(rating, { maximumFractionDigits: 1 }),
              })
        }
        hint={t("ratingHint", { count: summary.ratings })}
      />
      <Kpi
        label={t("firstResponse")}
        value={
          response === null
            ? "—"
            : tDuration(response.unit, {
                count: response.value,
                value: format.number(response.value, {
                  maximumFractionDigits: 1,
                }),
              })
        }
        hint={t("firstResponseHint")}
      />
      <Kpi
        label={t("resolved")}
        value={
          <KpiLink href={`${BASE}?status=resolved`} value={summary.resolved} />
        }
        hint={t("resolvedHint", { closed: summary.closed })}
      />
    </KpiGrid>
  );
}
