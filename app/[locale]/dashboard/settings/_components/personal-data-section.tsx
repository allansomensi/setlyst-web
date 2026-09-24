"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOfflineDisabled } from "@/components/offline-disabled";
import { useDownload } from "@/hooks/use-download";
import { toast } from "@/lib/toast";

/**
 * Settings → Data: "Download my personal data" — the account's profile,
 * preferences, consents, subscription, payments and security log, as JSON
 * (LGPD art. 18). Repertoire content is in the backup, next to it.
 */
export function PersonalDataSection() {
  const t = useTranslations("settings.personalData");
  const download = useDownload();
  const offlineDisabled = useOfflineDisabled();
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const saved = await download(
        "/api/export/personal-data",
        `setlyst-personal-data-${date}.json`,
      );
      if (saved) toast.success(t("done"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="text-primary size-4" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={run}
          title={offlineDisabled.title}
          disabled={pending || offlineDisabled.disabled}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("button")}
        </Button>
      </CardContent>
    </Card>
  );
}
