"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";

interface ExportPdfDialogProps {
  setlistId: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPdfDialog({
  setlistId,
  setlistTitle,
  isOpen,
  onClose,
}: ExportPdfDialogProps) {
  const t = useTranslations("setlists.exportPdf");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();
  const locale = useLocale();

  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState({
    show_title: true,
    show_total_duration: true,
    show_key: true,
    show_bpm: true,
  });

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    startTransition(async () => {
      try {
        const token = session?.user?.apiToken;
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

        const langMap: Record<string, string> = {
          en: "en",
          "pt-BR": "pt-BR",
          es: "es",
        };
        const lang = langMap[locale] ?? "en";

        const params = new URLSearchParams({
          show_title: String(options.show_title),
          show_total_duration: String(options.show_total_duration),
          show_key: String(options.show_key),
          show_bpm: String(options.show_bpm),
          lang,
        });

        const response = await fetch(
          `${baseUrl}/setlists/${setlistId}/export/pdf?${params}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const disposition = response.headers.get("content-disposition");
        let filename = `${setlistTitle}.pdf`;
        if (disposition?.includes("filename=")) {
          filename = disposition.split("filename=")[1].replace(/"/g, "");
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(t("exportSuccess"));
        onClose();
      } catch (error) {
        console.error(error);
        toast.error(t("exportFailed"));
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {(
            [
              ["show_title", t("showTitle")],
              ["show_total_duration", t("showTotalDuration")],
              ["show_key", t("showKey")],
              ["show_bpm", t("showBpm")],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors"
            >
              <Label className="cursor-pointer text-sm font-normal">
                {label}
              </Label>
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                checked={options[key]}
                onChange={() => toggleOption(key)}
                disabled={isPending}
              />
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {isPending ? t("exporting") : t("export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
