import { getTranslations } from "next-intl/server";
import { Gift, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Everything is free during the beta" or "30 days of Pro, no card",
 * depending on the API's billing switch (`GET /public/billing`). The page
 * passes the switch it already read: `fetchPublicApi` calls carry a
 * timeout signal, which Next.js never dedupes, so reading it here again
 * meant a second request (and, across a revalidation, a possibly
 * different answer from the rest of the page).
 */
export async function BillingNote({
  enforced,
  className,
}: {
  enforced: boolean;
  className?: string;
}) {
  const t = await getTranslations("pricing");
  const Icon = enforced ? Gift : Info;

  return (
    <p
      className={cn(
        "border-primary/25 bg-primary/5 text-foreground inline-flex items-start gap-2.5 rounded-xl border px-4 py-3 text-left text-sm leading-relaxed",
        className,
      )}
    >
      <Icon className="text-primary mt-0.5 size-4 shrink-0" />
      <span>{enforced ? t("trialNote") : t("preReleaseNote")}</span>
    </p>
  );
}
