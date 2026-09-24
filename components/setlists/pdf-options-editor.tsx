"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CHORD_MODES,
  CONTENT_TOGGLES,
  FONT_SCALES,
  MARGIN_SIZES,
  ORIENTATIONS,
  PAPER_FORMATS,
  PDF_PRESETS,
  PUBLIC_PDF_PRESETS,
  type PdfExportOptions,
} from "@/lib/pdf-export-options";

type Preset = keyof typeof PDF_PRESETS;
const PRESETS = Object.keys(PDF_PRESETS) as Preset[];
const PUBLIC_PRESETS = Object.keys(PUBLIC_PDF_PRESETS) as Preset[];

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint && (
          <span className="text-muted-foreground block text-xs">{hint}</span>
        )}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}

export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  render,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  render: (value: T) => string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Select
        value={String(value)}
        onValueChange={(raw) => {
          const next = options.find((option) => String(option) === raw);
          if (next !== undefined) onChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option)} value={String(option)}>
              {render(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Every PDF export option, grouped in tabs, with one-click presets. A
 * controlled component: the export dialog and Settings (saved defaults)
 * both render it. `allowLyrics={false}` (public share pages) hides the
 * lyrics tab and the songbook preset: a public link's PDF never carries
 * lyrics or chords.
 */
export function PdfOptionsEditor({
  value,
  onChange,
  disabled,
  allowLyrics = true,
}: {
  value: PdfExportOptions;
  onChange: (next: PdfExportOptions) => void;
  disabled?: boolean;
  allowLyrics?: boolean;
}) {
  const t = useTranslations("pdfOptions");
  const set = <K extends keyof PdfExportOptions>(
    key: K,
    next: PdfExportOptions[K],
  ) => onChange({ ...value, [key]: next });
  const presets = allowLyrics ? PRESETS : PUBLIC_PRESETS;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">
          {t("presets.title")}
        </p>
        <div
          className={cn(
            "grid grid-cols-2 gap-2",
            allowLyrics ? "sm:grid-cols-4" : "sm:grid-cols-3",
          )}
        >
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, ...PDF_PRESETS[preset] })}
              className="hover:bg-muted/60 focus-visible:ring-ring/50 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              <span className="block text-sm font-medium">
                {t(`presets.${preset}.name`)}
              </span>
              <span className="text-muted-foreground block text-xs">
                {t(`presets.${preset}.hint`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList className="w-full">
          <TabsTrigger value="content">{t("tabs.content")}</TabsTrigger>
          {allowLyrics && (
            <TabsTrigger value="lyrics">{t("tabs.lyrics")}</TabsTrigger>
          )}
          <TabsTrigger value="layout">{t("tabs.layout")}</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTENT_TOGGLES.map((key) => (
              <ToggleRow
                key={key}
                label={t(`toggles.${key}`)}
                checked={value[key]}
                onChange={(next) => set(key, next)}
                disabled={disabled}
              />
            ))}
          </div>
        </TabsContent>

        {allowLyrics && (
          <TabsContent value="lyrics" className="mt-3 space-y-2">
            <ToggleRow
              label={t("toggles.include_lyrics")}
              hint={t("hints.include_lyrics")}
              checked={value.include_lyrics}
              onChange={(next) => set("include_lyrics", next)}
              disabled={disabled}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice
                label={t("chords.label")}
                value={value.chords}
                options={CHORD_MODES}
                onChange={(next) => set("chords", next)}
                render={(mode) => t(`chords.${mode}`)}
                disabled={disabled || !value.include_lyrics}
              />
              <div className="flex items-end">
                <div className="w-full">
                  <ToggleRow
                    label={t("toggles.page_break_per_song")}
                    checked={value.page_break_per_song}
                    onChange={(next) => set("page_break_per_song", next)}
                    disabled={disabled || !value.include_lyrics}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="layout" className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Choice
              label={t("fontScale")}
              value={
                (FONT_SCALES as readonly number[]).includes(value.font_scale)
                  ? value.font_scale
                  : 100
              }
              options={FONT_SCALES as readonly number[]}
              onChange={(next) => set("font_scale", next)}
              render={(scale) => `${scale}%`}
              disabled={disabled}
            />
            <Choice
              label={t("columns.label")}
              value={value.columns}
              options={[1, 2] as const}
              onChange={(next) => set("columns", next)}
              render={(count) => t(`columns.${count}`)}
              disabled={disabled}
            />
            <Choice
              label={t("margins.label")}
              value={value.margins}
              options={MARGIN_SIZES}
              onChange={(next) => set("margins", next)}
              render={(size) => t(`margins.${size}`)}
              disabled={disabled}
            />
            <Choice
              label={t("paper")}
              value={value.paper}
              options={PAPER_FORMATS}
              onChange={(next) => set("paper", next)}
              render={(paper) => t(`papers.${paper}`)}
              disabled={disabled}
            />
            <Choice
              label={t("orientation.label")}
              value={value.orientation}
              options={ORIENTATIONS}
              onChange={(next) => set("orientation", next)}
              render={(orientation) => t(`orientation.${orientation}`)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleRow
              label={t("toggles.compact")}
              hint={t("hints.compact")}
              checked={value.compact}
              onChange={(next) => set("compact", next)}
              disabled={disabled}
            />
            <ToggleRow
              label={t("toggles.uppercase_titles")}
              checked={value.uppercase_titles}
              onChange={(next) => set("uppercase_titles", next)}
              disabled={disabled}
            />
            <ToggleRow
              label={t("toggles.page_numbers")}
              checked={value.page_numbers}
              onChange={(next) => set("page_numbers", next)}
              disabled={disabled}
            />
            <ToggleRow
              label={t("toggles.watermark")}
              hint={t("hints.watermark")}
              checked={value.watermark}
              onChange={(next) => set("watermark", next)}
              disabled={disabled}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
