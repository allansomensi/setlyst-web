"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { saveBlob } from "@/lib/download";
import { toast } from "@/lib/toast";

interface RecoveryCodesPanelProps {
  codes: string[];
  username: string;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
}

/**
 * Freshly issued recovery codes, shown this one time only: copy, download
 * as a .txt, and an explicit "I saved them" before the dialog can close.
 */
export function RecoveryCodesPanel({
  codes,
  username,
  acknowledged,
  onAcknowledgedChange,
}: RecoveryCodesPanelProps) {
  const t = useTranslations("twoFactor.codes");
  const [copied, setCopied] = useState(false);

  const asText = () =>
    [
      t("fileHeader", { username }),
      t("fileNote"),
      "",
      ...codes,
      "",
      t("fileGenerated", { date: new Date().toISOString().slice(0, 10) }),
    ].join("\n");

  const copy = async () => {
    if (await copyText(codes.join("\n"))) {
      setCopied(true);
      toast.success(t("copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t("copyFailed"));
    }
  };

  const download = () => {
    saveBlob(
      new Blob([asText()], { type: "text/plain;charset=utf-8" }),
      `setlyst-recovery-codes-${username}.txt`,
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("explanation")}</p>
      <ol
        aria-label={t("listLabel")}
        className="bg-muted/50 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border p-4 font-mono text-sm tracking-wider"
      >
        {codes.map((code) => (
          <li key={code} className="text-center select-all">
            {code}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={copy}
        >
          {copied ? (
            <Check className="mr-2 size-4" />
          ) : (
            <Copy className="mr-2 size-4" />
          )}
          {t("copy")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={download}
        >
          <Download className="mr-2 size-4" />
          {t("download")}
        </Button>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => onAcknowledgedChange(event.target.checked)}
          className="accent-primary mt-0.5 size-4 shrink-0 cursor-pointer"
        />
        <span className="leading-snug">{t("acknowledge")}</span>
      </label>
    </div>
  );
}
