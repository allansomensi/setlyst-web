import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUPPORT_EMAIL } from "@/lib/links";

/** Explains why a setlist or show can't be shared right now. */
export function ShareLockedNotice({ reason }: { reason: string | null }) {
  const t = useTranslations("shareLock");
  return (
    <Alert variant="destructive">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>{t("description")}</p>
        {reason && <p>{t("reason", { reason })}</p>}
        <p>{t("contact", { email: SUPPORT_EMAIL })}</p>
      </AlertDescription>
    </Alert>
  );
}
