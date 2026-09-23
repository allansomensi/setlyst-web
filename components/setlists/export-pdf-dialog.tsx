"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileDown, Languages, Loader2, RotateCcw } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { LOCALE_NAMES, isAppLocale, type AppLocale } from "@/i18n/locales";
import {
  DEFAULT_PDF_OPTIONS,
  MAX_SUBTITLE_LENGTH,
  pdfOptionsToQuery,
  type PdfExportOptions,
} from "@/lib/pdf-export-options";
import { PdfOptionsEditor } from "./pdf-options-editor";

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
 * PDF export — shared by the dashboard and the public share page, which
 * differ only in the endpoint and whether a token is sent (and so whether
 * the options can be saved as the account's default).
 *
 * The printed language is chosen here rather than inferred from the UI:
 * a band sheet often goes to a sound engineer or a venue that doesn't
 * read the language the app happens to be set to.
 */
export function ExportPdfDialog(props: ExportPdfDialogProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {/* Remounted on every open, so it starts from the saved defaults. */}
        {props.isOpen && <ExportForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function ExportForm({
  endpoint,
  authToken,
  setlistTitle,
  onClose,
}: ExportPdfDialogProps) {
  const t = useTranslations("setlists.exportPdf");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { settings, update } = useUiSettings();
  const canSaveDefault = Boolean(authToken);

  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<PdfExportOptions>(settings.pdf);
  const [language, setLanguage] = useState<AppLocale>(
    isAppLocale(locale) ? locale : "en",
  );
  const [subtitle, setSubtitle] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const handleExport = () => {
    startTransition(async () => {
      try {
        const query = pdfOptionsToQuery(options, { lang: language, subtitle });
        const response = await fetch(`${endpoint}?${query}`, {
          method: "GET",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });

        if (!response.ok) {
          toast.error(
            response.status === 429 ? t("rateLimited") : t("exportFailed"),
          );
          return;
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

        if (saveAsDefault && canSaveDefault) {
          const saved = await update({ pdf: options });
          if (!saved.success) toast.error(t("defaultNotSaved"));
        }

        toast.success(t("exportSuccess"));
        onClose();
      } catch (error) {
        console.error(error);
        toast.error(t("exportFailed"));
      }
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="pdf-language"
            className="text-muted-foreground flex items-center gap-1.5 text-xs"
          >
            <Languages className="h-3.5 w-3.5" />
            {t("language")}
          </Label>
          <Select
            value={language}
            onValueChange={(value) => isAppLocale(value) && setLanguage(value)}
            disabled={isPending}
          >
            <SelectTrigger id="pdf-language" className="w-full">
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
        <div className="space-y-1.5">
          <Label
            htmlFor="pdf-subtitle"
            className="text-muted-foreground text-xs"
          >
            {t("subtitle")}
          </Label>
          <Input
            id="pdf-subtitle"
            value={subtitle}
            onChange={(e) =>
              setSubtitle(e.target.value.slice(0, MAX_SUBTITLE_LENGTH))
            }
            placeholder={t("subtitlePlaceholder")}
            disabled={isPending}
          />
        </div>
      </div>

      <PdfOptionsEditor
        value={options}
        onChange={setOptions}
        disabled={isPending}
      />

      <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {canSaveDefault && (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={saveAsDefault}
                onCheckedChange={setSaveAsDefault}
                disabled={isPending}
              />
              {t("saveAsDefault")}
            </label>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOptions(DEFAULT_PDF_OPTIONS)}
            disabled={isPending}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {t("resetOptions")}
          </Button>
        </div>
        <div className="flex gap-2">
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
        </div>
      </DialogFooter>
    </>
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
