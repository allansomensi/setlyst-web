import { getTranslations } from "next-intl/server";
import { Construction } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { STATUS_PATH } from "@/lib/links";
import type { MaintenanceSettings } from "@/types/operations";
import { MaintenanceDetails } from "./maintenance-details";

/**
 * Above the sign-in form during full maintenance: only staff accounts
 * can sign in (the API refuses everyone else with MAINTENANCE_MODE), so
 * the form stays usable for them while everyone else learns why before
 * typing a password.
 */
export async function MaintenanceSignInNotice({
  maintenance,
}: {
  maintenance: Pick<MaintenanceSettings, "message" | "ends_at">;
}) {
  const t = await getTranslations("maintenance");

  return (
    <Alert variant="warning">
      <Construction aria-hidden />
      <AlertTitle>{t("signIn.title")}</AlertTitle>
      <AlertDescription>
        <p>{t("signIn.description")}</p>
        <MaintenanceDetails maintenance={maintenance} />
        <p>
          <Link
            href={STATUS_PATH}
            className="focus-visible:ring-ring/50 rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3"
          >
            {t("statusLink")}
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  );
}
