import { getTranslations } from "next-intl/server";
import { Activity, Construction, LogIn, UserX } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaintenanceDetails } from "@/components/maintenance/maintenance-details";
import { STATUS_PATH } from "@/lib/links";
import type { MaintenanceSettings } from "@/types/operations";

/**
 * Shown instead of the sign-up form while new accounts can't be created:
 * sign-ups switched off (`closed`) or the platform in maintenance
 * (`maintenance`, with what the team said and until when). Existing
 * accounts are pointed to the sign-in page.
 */
export async function SignUpsClosed({
  reason,
  maintenance = null,
  callbackPath = null,
}: {
  reason: "closed" | "maintenance";
  maintenance?: Pick<MaintenanceSettings, "message" | "ends_at"> | null;
  /** Kept on the way to the sign-in page (an invite link, Live Mode...). */
  callbackPath?: string | null;
}) {
  const t = await getTranslations("maintenance.signUp");
  const tMaintenance = await getTranslations("maintenance");
  const Icon = reason === "maintenance" ? Construction : UserX;

  return (
    <Card size="lg" className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <AppLogo size={56} priority className="mx-auto mb-2 rounded-xl" />
        <div className="bg-muted text-muted-foreground mx-auto mb-1 flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </div>
        <CardTitle as="h1" className="text-2xl font-bold">
          {reason === "maintenance" ? t("maintenanceTitle") : t("closedTitle")}
        </CardTitle>
        <CardDescription>
          {reason === "maintenance"
            ? t("maintenanceDescription")
            : t("closedDescription")}
        </CardDescription>
      </CardHeader>
      {reason === "maintenance" && maintenance && (
        <CardContent>
          <MaintenanceDetails
            maintenance={maintenance}
            className="bg-muted/50 rounded-lg border px-4 py-3 text-center text-sm"
          />
        </CardContent>
      )}
      <CardFooter className="flex flex-col gap-3 border-t py-4">
        <p className="text-muted-foreground text-sm">{t("haveAccount")}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link
              href={
                callbackPath
                  ? { pathname: "/login", query: { callbackUrl: callbackPath } }
                  : "/login"
              }
            >
              <LogIn className="mr-2 h-4 w-4" aria-hidden />
              {t("signIn")}
            </Link>
          </Button>
          {reason === "maintenance" && (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href={STATUS_PATH}>
                <Activity className="mr-2 h-4 w-4" aria-hidden />
                {tMaintenance("statusLink")}
              </a>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
