import { getTranslations } from "next-intl/server";
import { Activity, Construction } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
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
import { LogoutButton } from "./logout-button";

/**
 * Shown by the dashboard layout instead of the dashboard while full
 * maintenance closes the platform to everyone but staff (the API would
 * refuse every request anyway). Says what's going on and until when,
 * points to the status page, and lets the person sign out.
 */
export async function MaintenanceScreen({
  maintenance,
}: {
  maintenance: Pick<MaintenanceSettings, "message" | "ends_at">;
}) {
  const t = await getTranslations("maintenance");

  return (
    // Marked like an error boundary so the service worker never stores
    // this screen as the offline copy of the dashboard or Live Mode page
    // it replaces (public/sw.js, isUsableForCache).
    <main
      data-error-boundary="maintenance"
      id="main-content"
      className="bg-muted/40 flex min-h-dvh items-center justify-center pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
    >
      <Card size="lg" className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <AppLogo size={48} className="mx-auto mb-2 rounded-xl" />
          <div className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Construction className="size-5" aria-hidden />
          </div>
          <CardTitle as="h1" className="text-2xl font-bold">
            {t("screen.title")}
          </CardTitle>
          <CardDescription>{t("screen.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceDetails
            maintenance={maintenance}
            className="bg-muted/50 rounded-lg border px-4 py-3 text-center text-sm"
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t py-4 sm:flex-row sm:justify-center">
          <Button asChild variant="default" className="w-full sm:w-auto">
            {/* A plain link: /status lives outside the locale segment. */}
            <a href={STATUS_PATH}>
              <Activity className="mr-2 h-4 w-4" aria-hidden />
              {t("statusLink")}
            </a>
          </Button>
          <LogoutButton labelled />
        </CardFooter>
      </Card>
    </main>
  );
}
