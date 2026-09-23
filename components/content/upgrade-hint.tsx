import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/nav-link";
import { cn } from "@/lib/utils";

/**
 * Says a feature is not in the person's plan and where to see the plans.
 * Shown next to disabled controls, never instead of an explanation.
 */
export function UpgradeHint({
  className,
  message,
}: {
  className?: string;
  /** Overrides the generic sentence. */
  message?: string;
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
          href="/pricing"
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          {t("upgrade.link")}
        </Link>
      </span>
    </p>
  );
}
