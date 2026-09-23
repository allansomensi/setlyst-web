"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileDown, Languages, Loader2, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast";
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
import { useDownload } from "@/hooks/use-download";
import { PdfOptionsEditor } from "./pdf-options-editor";

interface ExportPdfDialogProps {
  /**
   * The export URL, without query string: the app's own route handler
   * (`/api/export/setlists/{id}/pdf`) for signed-in people, the API's
   * public endpoint on a share page.
   */
  endpoint: string;
  /** Offer "save as my default" (signed-in exports only). */
  canSaveDefault?: boolean;
  setlistTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * PDF export, shared by the dashboard and the public share page, which
 * differ only in the endpoint and in whether the options can be saved as
 * the account's default.
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
  canSaveDefault = false,
  setlistTitle,
  onClose,
}: ExportPdfDialogProps) {
  const t = useTranslations("setlists.exportPdf");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { settings, update } = useUiSettings();
  const download = useDownload();

  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<PdfExportOptions>(settings.pdf);
  const [language, setLanguage] = useState<AppLocale>(
    isAppLocale(locale) ? locale : "en",
  );
  const [subtitle, setSubtitle] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const handleExport = () => {
    startTransition(async () => {
      const query = pdfOptionsToQuery(options, { lang: language, subtitle });
      const saved = await download(
        `${endpoint}?${query}`,
        `${setlistTitle}.pdf`,
      );
      if (!saved) return;

      if (saveAsDefault && canSaveDefault) {
        const result = await update({ pdf: options });
        if (!result.success) toast.error(t("defaultNotSaved"));
      }

      toast.success(t("exportSuccess"));
      onClose();
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
