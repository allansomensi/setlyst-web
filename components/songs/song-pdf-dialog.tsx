"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileDown, Loader2, RotateCcw } from "lucide-react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { LOCALE_NAMES, isAppLocale, type AppLocale } from "@/i18n/locales";
import { Choice, ToggleRow } from "@/components/setlists/pdf-options-editor";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import {
  CHORD_MODES,
  DEFAULT_SONG_PDF_OPTIONS,
  FONT_SCALES,
  MARGIN_SIZES,
  ORIENTATIONS,
  PAPER_FORMATS,
  SONG_HEADER_TOGGLES,
  songPdfOptionsFrom,
  songPdfOptionsToQuery,
  withoutAdvancedSongOptions,
  type SongPdfOptions,
} from "@/lib/pdf-export-options";
import { useDownload } from "@/hooks/use-download";

interface SongPdfDialogProps {
  songId: string;
  songTitle: string;
  isOpen: boolean;
  onClose: () => void;
  /** `hasFeature(entitlements, "advanced_pdf")`, resolved by the page. */
  canUseAdvanced: boolean;
  /**
   * `hasFeature(entitlements, "pdf_export")`: without it the export
   * button is disabled with a pointer to the plans.
   */
  canExport?: boolean;
}

/**
 * "Exportar PDF" for one song: which header lines to print, how chords
 * look and the page layout. Two columns, no watermark and custom margins
 * are advanced options; without the `advanced_pdf` feature they stay
 * disabled with a pointer to the plans.
 */
export function SongPdfDialog(props: SongPdfDialogProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {props.isOpen && <SongPdfForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function SongPdfForm({
  songId,
  songTitle,
  onClose,
  canUseAdvanced,
  canExport = true,
}: SongPdfDialogProps) {
  const t = useTranslations("songExport.pdf");
  const tOptions = useTranslations("pdfOptions");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { settings } = useUiSettings();
  const download = useDownload();

  const start = songPdfOptionsFrom(settings.pdf);
  const [options, setOptions] = useState<SongPdfOptions>(
    canUseAdvanced ? start : withoutAdvancedSongOptions(start),
  );
  const [language, setLanguage] = useState<AppLocale>(
    isAppLocale(locale) ? locale : "en",
  );
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof SongPdfOptions>(
    key: K,
    value: SongPdfOptions[K],
  ) => setOptions((prev) => ({ ...prev, [key]: value }));

  const handleExport = () => {
    startTransition(async () => {
      const safe = canUseAdvanced
        ? options
        : withoutAdvancedSongOptions(options);
      const saved = await download(
        `/api/export/songs/${songId}/pdf?${songPdfOptionsToQuery(safe, language)}`,
        `${songTitle}.pdf`,
      );
      if (!saved) return;
      toast.success(t("success"));
      onClose();
    });
  };

  const locked = !canUseAdvanced;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>
          {t("description", { title: songTitle })}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <section className="space-y-2" aria-labelledby="song-pdf-header">
          <h3 id="song-pdf-header" className="text-sm font-semibold">
            {t("headerSection")}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {SONG_HEADER_TOGGLES.map((key) => (
              <ToggleRow
                key={key}
                label={t(`toggles.${key}`)}
                checked={options[key]}
                onChange={(next) => set(key, next)}
                disabled={isPending}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2" aria-labelledby="song-pdf-layout">
          <h3 id="song-pdf-layout" className="text-sm font-semibold">
            {t("layoutSection")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Choice
              label={tOptions("chords.label")}
              value={options.chord_mode}
              options={CHORD_MODES}
              onChange={(next) => set("chord_mode", next)}
              render={(mode) => tOptions(`chords.${mode}`)}
              disabled={isPending}
            />
            <Choice
              label={tOptions("fontScale")}
              value={
                (FONT_SCALES as readonly number[]).includes(options.font_scale)
                  ? options.font_scale
                  : 100
              }
              options={FONT_SCALES as readonly number[]}
              onChange={(next) => set("font_scale", next)}
              render={(scale) => `${scale}%`}
              disabled={isPending}
            />
            <Choice
              label={tOptions("paper")}
              value={options.paper}
              options={PAPER_FORMATS}
              onChange={(next) => set("paper", next)}
              render={(paper) => tOptions(`papers.${paper}`)}
              disabled={isPending}
            />
            <Choice
              label={tOptions("orientation.label")}
              value={options.orientation}
              options={ORIENTATIONS}
              onChange={(next) => set("orientation", next)}
              render={(value) => tOptions(`orientation.${value}`)}
              disabled={isPending}
            />
            <div className="space-y-1.5">
              <Label
                htmlFor="song-pdf-language"
                className="text-muted-foreground text-xs"
              >
                {t("language")}
              </Label>
              <NativeSelect
                id="song-pdf-language"
                value={language}
                onChange={(e) =>
                  isAppLocale(e.target.value) && setLanguage(e.target.value)
                }
                disabled={isPending}
              >
                {(Object.keys(LOCALE_NAMES) as AppLocale[]).map((code) => (
                  <option key={code} value={code}>
                    {LOCALE_NAMES[code]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleRow
              label={tOptions("toggles.uppercase_titles")}
              checked={options.uppercase_titles}
              onChange={(next) => set("uppercase_titles", next)}
              disabled={isPending}
            />
            <ToggleRow
              label={tOptions("toggles.page_numbers")}
              checked={options.page_numbers}
              onChange={(next) => set("page_numbers", next)}
              disabled={isPending}
            />
          </div>
        </section>

        <section
          className="space-y-2 rounded-lg border border-dashed p-3"
          aria-labelledby="song-pdf-advanced"
        >
          <h3 id="song-pdf-advanced" className="text-sm font-semibold">
            {t("advancedSection")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              label={tOptions("columns.label")}
              value={options.columns}
              options={[1, 2] as const}
              onChange={(next) => set("columns", next)}
              render={(count) => tOptions(`columns.${count}`)}
              disabled={isPending || locked}
            />
            <Choice
              label={tOptions("margins.label")}
              value={options.margins}
              options={MARGIN_SIZES}
              onChange={(next) => set("margins", next)}
              render={(size) => tOptions(`margins.${size}`)}
              disabled={isPending || locked}
            />
          </div>
          <ToggleRow
            label={tOptions("toggles.watermark")}
            hint={tOptions("hints.watermark")}
            checked={options.watermark}
            onChange={(next) => set("watermark", next)}
            disabled={isPending || locked}
          />
          {locked && <UpgradeHint message={t("advancedLocked")} />}
        </section>
      </div>

      {!canExport && <UpgradeHint message={t("locked")} />}

      <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOptions(DEFAULT_SONG_PDF_OPTIONS)}
          disabled={isPending}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {t("reset")}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isPending || !canExport}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileDown className="mr-2 h-4 w-4" aria-hidden />
            )}
            {isPending ? t("exporting") : t("export")}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
