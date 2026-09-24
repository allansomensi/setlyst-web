import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import { cn } from "@/lib/utils";

/** Where "Ver planos" leads from inside the app: the plan picker. */
export const IN_APP_PLANS_HREF = "/dashboard/settings?section=subscription";

/**
 * Says a feature is not in the person's plan and where to see the plans.
 * Shown next to disabled controls, never instead of an explanation.
 */
export function UpgradeHint({
  className,
  message,
  href = IN_APP_PLANS_HREF,
}: {
  className?: string;
  /** Overrides the generic sentence. */
  message?: string;
  /**
   * Defaults to the subscription settings, where a plan can be bought
   * without leaving the app (the public /pricing page took people out of
   * it, to a page that only sends signed-in visitors back).
   */
  href?: string;
}) {
  const t = useTranslations("songExport");
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-start gap-1.5 text-xs",
        className,
      )}
    >
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {message ?? t("upgrade.message")}{" "}
        <Link
          href={href}
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          {t("upgrade.link")}
        </Link>
      </span>
    </p>
  );
}
