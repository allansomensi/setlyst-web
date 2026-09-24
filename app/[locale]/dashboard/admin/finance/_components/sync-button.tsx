"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { syncFinance } from "../actions";

/** Safety limit on the number of steps of one sync. */
const MAX_STEPS = 200;

/**
 * "Sincronizar com o Stripe": imports paid invoices and refunds the
 * webhook missed. The API works in short steps; this repeats them until
 * it says it's done.
 */
export function SyncButton({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("finance.sync");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);

  const run = () =>
    startTransition(async () => {
      let cursor: string | null = null;
      const total = { scanned: 0, imported: 0, refunds: 0 };
      for (let step = 0; step < MAX_STEPS; step++) {
        const result = await syncFinance(cursor);
        if (!result.success) {
          setProgress(null);
          toastActionError(result, result.error);
          router.refresh();
          return;
        }
        const data = result.data;
        if (!data) break;
        total.scanned += data.scanned;
        total.imported += data.imported;
        total.refunds += data.refunds_applied;
        setProgress(total.scanned);
        if (data.done || !data.cursor) break;
        cursor = data.cursor;
      }
      setProgress(null);
      toast.success(
        t("done", {
          scanned: total.scanned,
          imported: total.imported,
          refunds: total.refunds,
        }),
      );
      router.refresh();
    });

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={disabled || pending}
      title={t("hint")}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-4" aria-hidden />
      )}
      {pending
        ? progress
          ? t("progress", { count: progress })
          : t("running")
        : t("button")}
    </Button>
  );
}
