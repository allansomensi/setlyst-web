"use client";

import { useState, useTransition } from "react";
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

interface PublicExportPdfDialogProps {
  token: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const OPTIONS_CONFIG = [
  ["show_title", "Show title"],
  ["show_total_duration", "Show total duration"],
  ["show_key", "Show key"],
  ["show_bpm", "Show BPM"],
  ["show_blocks", "Show blocks"],
  ["show_breaks", "Show breaks"],
] as const;

/**
 * Standalone PDF export dialog for the public setlist page. Deliberately
 * doesn't reuse `ExportPdfDialog` from the dashboard: this page renders
 * outside the `[locale]` segment (no `NextIntlClientProvider`, same as
 * `app/status`), so it can't use next-intl hooks or next-auth's session.
 */
export function PublicExportPdfDialog({
  token,
  setlistTitle,
  isOpen,
  onClose,
}: PublicExportPdfDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState({
    show_title: true,
    show_total_duration: true,
    show_key: true,
    show_bpm: true,
    show_blocks: true,
    show_breaks: true,
  });

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    setError(null);
    startTransition(async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

        const params = new URLSearchParams({
          show_title: String(options.show_title),
          show_total_duration: String(options.show_total_duration),
          show_key: String(options.show_key),
          show_bpm: String(options.show_bpm),
          show_blocks: String(options.show_blocks),
          show_breaks: String(options.show_breaks),
          lang: "en",
        });

        const response = await fetch(
          `${baseUrl}/public/setlists/${token}/export/pdf?${params}`,
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

        onClose();
      } catch (err) {
        console.error(err);
        setError("Couldn't export the PDF. Please try again.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Choose what to include in the PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {OPTIONS_CONFIG.map(([key, label]) => (
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {isPending ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
