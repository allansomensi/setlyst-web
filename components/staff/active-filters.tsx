import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

/**
 * Shows "Only @alice" / "Only band X" when a staff listing was opened
 * pre-filtered from another page, with a one-click way to clear it.
 */
export async function ActiveFilters({
  basePath,
  params,
  labels,
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  /** param name → human label for the active value */
  labels: Record<string, string | null | undefined>;
}) {
  const t = await getTranslations("staff.lists");
  const active = Object.entries(labels).filter(
    ([key, label]) => label && params[key],
  );
  if (active.length === 0) return null;

  const without = (key: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === key || k === "page" || v === undefined) continue;
      next.set(k, Array.isArray(v) ? v[0] : v);
    }
    const query = next.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("filteredBy")}</span>
      {active.map(([key, label]) => (
        <Link
          key={key}
          href={without(key)}
          className="bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          aria-label={t("clearFilter", { label: label ?? "" })}
        >
          {label}
          <X className="h-3 w-3" />
        </Link>
      ))}
    </div>
  );
}
