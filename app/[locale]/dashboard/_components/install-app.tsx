"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * "Install the app": the browser's own install dialog where there is one
 * (Chrome, Edge, Android), the Share → Add to Home Screen steps on iPhone
 * and iPad, and a pointer to the browser menu elsewhere. Says so when it
 * is already running as the installed app.
 */
export function InstallApp({ className }: { className?: string }) {
  const t = useTranslations("installApp");
  const { state, install } = useInstallPrompt();
  const [showSteps, setShowSteps] = useState(false);

  if (state === "installed") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        {t("installed")}
      </p>
    );
  }

  if (state === "promptable") {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          variant="outline"
          onClick={async () => {
            if (await install()) toast.success(t("done"));
          }}
        >
          <Download className="mr-2 size-4" aria-hidden />
          {t("button")}
        </Button>
        <p className="text-muted-foreground text-xs">{t("why")}</p>
      </div>
    );
  }

  if (state === "ios") {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          variant="outline"
          aria-expanded={showSteps}
          aria-controls="install-ios-steps"
          onClick={() => setShowSteps((open) => !open)}
        >
          <Share className="mr-2 size-4" aria-hidden />
          {t("howTo")}
        </Button>
        {showSteps && (
          <ol
            id="install-ios-steps"
            className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm"
          >
            <li>{t("ios.step1")}</li>
            <li>{t("ios.step2")}</li>
            <li>{t("ios.step3")}</li>
          </ol>
        )}
      </div>
    );
  }

  return (
    <p className={cn("text-muted-foreground text-sm", className)}>
      {t("browserMenu")}
    </p>
  );
}
