"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, FileDown, Languages } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOCALE_NAMES, isAppLocale, type AppLocale } from "@/i18n/locales";

const OPTION_KEYS = [
  ["show_title", "showTitle"],
  ["show_total_duration", "showTotalDuration"],
  ["show_key", "showKey"],
  ["show_bpm", "showBpm"],
  ["show_blocks", "showBlocks"],
  ["show_breaks", "showBreaks"],
] as const;

type OptionKey = (typeof OPTION_KEYS)[number][0];

interface ExportPdfDialogProps {
  /** The export endpoint, without query string. */
  endpoint: string;
  /** Bearer token for the authenticated endpoint; omitted for public links. */
  authToken?: string;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PDF export options — shared by the dashboard and the public share page,
 * which differ only in the endpoint and whether a token is sent.
 *
 * The printed language is chosen here rather than inferred from the UI:
 * a band sheet often goes to a sound engineer or a venue that doesn't
 * read the language the app happens to be set to. It defaults to the
 * current UI language.
 */
export function ExportPdfDialog({
  endpoint,
  authToken,
  setlistTitle,
  isOpen,
  onClose,
}: ExportPdfDialogProps) {
  const t = useTranslations("setlists.exportPdf");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [isPending, startTransition] = useTransition();
  const [language, setLanguage] = useState<AppLocale>(
    isAppLocale(locale) ? locale : "en",
  );
  const [options, setOptions] = useState<Record<OptionKey, boolean>>({
    show_title: true,
    show_total_duration: true,
    show_key: true,
    show_bpm: true,
    show_blocks: true,
    show_breaks: true,
  });

  const toggleOption = (key: OptionKey) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams({
          ...Object.fromEntries(
            Object.entries(options).map(([k, v]) => [k, String(v)]),
          ),
          lang: language,
        });

        const response = await fetch(`${endpoint}?${params}`, {
          method: "GET",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });

        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          filenameFromDisposition(
            response.headers.get("content-disposition"),
          ) ?? `${setlistTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoking in the same tick can cancel the download in Safari.
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

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

        <div className="space-y-2 py-1">
          <Label
            htmlFor="pdf-language"
            className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium"
          >
            <Languages className="h-3.5 w-3.5" />
            {t("language")}
          </Label>
          <Select
            value={language}
            onValueChange={(value) => {
              if (isAppLocale(value)) setLanguage(value);
            }}
            disabled={isPending}
          >
            <SelectTrigger id="pdf-language" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LOCALE_NAMES) as AppLocale[]).map((code) => (
                <SelectItem key={code} value={code}>
                  {LOCALE_NAMES[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {OPTION_KEYS.map(([key, labelKey]) => (
            <label
              key={key}
              className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors"
            >
              <span className="text-sm">{t(labelKey)}</span>
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

/**
 * Reads the file name out of a Content-Disposition header, preferring the
 * RFC 5987 `filename*` form (which carries non-ASCII titles intact) over
 * the plain one.
 */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const extended = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // Fall through to the plain form.
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}
