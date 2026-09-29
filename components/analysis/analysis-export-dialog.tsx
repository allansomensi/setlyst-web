"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Download, Loader2, Share2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { onRadioGroupKeyDown } from "@/hooks/radio-group-keys";
import { dataUrlToBlob, saveBlob } from "@/lib/download";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { HarmonicAnalysis, SheetLine } from "@/lib/music/analysis";
import { AnalysisSheet } from "./analysis-sheet";
import { AnalysisFootnotes, AnalysisLegend } from "./analysis-legend";

export interface ExportSong {
  title: string;
  artist: string | null;
  tonality: string | null;
  tempo: number | null;
  timeSignature: string | null;
}

interface ExportOptions {
  theme: "light" | "dark";
  width: "portrait" | "wide";
  chords: boolean;
  lyrics: boolean;
  legend: boolean;
  notes: boolean;
  summary: boolean;
}

const WIDTH = { portrait: 900, wide: 1280 } as const;
const BACKGROUND = { light: "#fbfbfe", dark: "#16151f" } as const;

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "analysis"
  );
}

/**
 * The analysis as a sheet of its own: title and key on top, the analysed
 * chart, then the legend of what it uses, the numbered notes and the
 * commentary. Rendered at a fixed width in a fixed palette, so the image
 * looks the same whatever screen and theme it was made on.
 */
function ExportSheet({
  song,
  analysis,
  lines,
  chords,
  options,
  author,
}: {
  song: ExportSong;
  analysis: HarmonicAnalysis;
  lines: SheetLine[];
  chords: readonly string[];
  options: ExportOptions;
  author: string | null;
}) {
  const t = useTranslations("analysis");
  const shown: HarmonicAnalysis = {
    ...analysis,
    display: {
      ...analysis.display,
      showChords: options.chords,
      showLyrics: options.lyrics,
    },
  };
  const hasLegend =
    options.legend &&
    (analysis.connections.length > 0 ||
      Object.values(analysis.entries).some(
        (e) => e.badges.length > 0 || (analysis.display.showFunctions && e.fn),
      ));
  const hasNotes =
    options.notes &&
    (analysis.notes.length > 0 ||
      Object.values(analysis.entries).some((e) => e.note.trim()));
  const hasSummary = options.summary && analysis.summary.trim().length > 0;
  const facts = [
    song.tonality && t("export.key", { key: song.tonality }),
    song.tempo && t("export.bpm", { bpm: song.tempo }),
    song.timeSignature,
  ].filter(Boolean) as string[];

  return (
    <div
      data-analysis-theme={options.theme}
      className="bg-background text-foreground font-sans"
      style={{ width: WIDTH[options.width], padding: "56px 64px 40px" }}
    >
      <header className="mb-8 flex items-end justify-between gap-8 border-b pb-6">
        <div className="min-w-0">
          <p className="text-primary text-[13px] font-bold tracking-[0.2em] uppercase">
            {t("export.kicker")}
          </p>
          <h1 className="mt-1 text-[38px] leading-tight font-extrabold tracking-tight">
            {song.title}
          </h1>
          {song.artist && (
            <p className="text-muted-foreground mt-1 text-[19px]">
              {song.artist}
            </p>
          )}
        </div>
        {facts.length > 0 && (
          <div className="flex shrink-0 gap-2">
            {facts.map((fact) => (
              <span
                key={fact}
                className="bg-muted rounded-full px-3.5 py-1.5 text-[15px] font-semibold"
              >
                {fact}
              </span>
            ))}
          </div>
        )}
      </header>

      <AnalysisSheet
        lines={lines}
        analysis={shown}
        songKey={song.tonality}
        mode="export"
        style={{ fontSize: 19 }}
      />

      {(hasLegend || hasNotes || hasSummary) && (
        <div
          className={cn(
            "mt-10 grid gap-8 border-t pt-7",
            options.width === "wide" &&
              hasLegend &&
              (hasNotes || hasSummary) &&
              "grid-cols-2",
          )}
        >
          {hasLegend && (
            <section>
              <h2 className="text-muted-foreground mb-3 text-[12px] font-bold tracking-[0.18em] uppercase">
                {t("export.legend")}
              </h2>
              <AnalysisLegend
                analysis={analysis}
                usedOnly
                columns={options.width === "wide" ? 1 : 2}
                className="text-[15px]"
              />
            </section>
          )}
          {(hasNotes || hasSummary) && (
            <div className="space-y-7">
              {hasNotes && (
                <section>
                  <h2 className="text-muted-foreground mb-3 text-[12px] font-bold tracking-[0.18em] uppercase">
                    {t("export.notes")}
                  </h2>
                  <AnalysisFootnotes
                    analysis={analysis}
                    chords={chords}
                    className="text-[15px]"
                  />
                </section>
              )}
              {hasSummary && (
                <section>
                  <h2 className="text-muted-foreground mb-2 text-[12px] font-bold tracking-[0.18em] uppercase">
                    {t("export.summary")}
                  </h2>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                    {analysis.summary.trim()}
                  </p>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="text-muted-foreground mt-10 flex items-center justify-between border-t pt-4 text-[12px]">
        <span>
          {author
            ? t("export.byline", { author })
            : t("export.bylineAnonymous")}
        </span>
        <span className="font-semibold tracking-wide">Setlyst</span>
      </footer>
    </div>
  );
}

function Option({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div
        role="radiogroup"
        onKeyDown={onRadioGroupKeyDown}
        aria-label={label}
        className="bg-muted grid grid-cols-2 gap-0.5 rounded-lg p-0.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-visible:ring-ring/50 rounded-md px-2 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3",
              value === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnalysisExportDialog({
  open,
  onOpenChange,
  song,
  analysis,
  lines,
  chords,
  author,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: ExportSong;
  analysis: HarmonicAnalysis;
  lines: SheetLine[];
  chords: readonly string[];
  author: string | null;
}) {
  const t = useTranslations("analysis.export");
  const [options, setOptions] = useState<ExportOptions>({
    theme: "light",
    width: "portrait",
    chords: analysis.display.showChords,
    lyrics: analysis.display.showLyrics,
    legend: true,
    notes: true,
    summary: true,
  });
  const [busy, setBusy] = useState<null | "download" | "copy" | "share">(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  // The preview frame, as state: it only exists once the dialog's content
  // has mounted, which is after `open` turns true.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState({ scale: 0.4, height: 400 });

  const set = (patch: Partial<ExportOptions>) =>
    setOptions((o) => ({ ...o, ...patch }));

  // Each opening starts from what the chart shows right now.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOptions((o) => ({
        ...o,
        chords: analysis.display.showChords,
        lyrics: analysis.display.showLyrics,
      }));
    }
  }

  // Fit the full-size sheet into the preview column.
  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!frame || !node) return;
    const update = () => {
      const scale = Math.min(1, frame.clientWidth / node.offsetWidth);
      setPreview({ scale, height: node.offsetHeight * scale });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame, options.width]);

  const render = async (): Promise<Blob> => {
    const node = nodeRef.current?.firstElementChild as HTMLElement | null;
    if (!node) throw new Error("Nothing to export");
    const { toPng } = await import("html-to-image");
    await document.fonts?.ready;
    const png = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: BACKGROUND[options.theme],
    });
    return dataUrlToBlob(png);
  };

  const filename = `${slug(song.title)}-${slug(t("fileSuffix"))}.png`;

  const run = async (kind: "download" | "copy" | "share") => {
    setBusy(kind);
    try {
      if (kind === "copy") {
        // Safari only lets the clipboard be written during the click
        // itself; by the time the image is rendered that's over. Handing
        // ClipboardItem the pending blob starts the write right away,
        // still inside the gesture, and it completes when the PNG does.
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": render() }),
        ]);
        toast.success(t("copied"));
        return;
      }
      const blob = await render();
      if (kind === "download") {
        saveBlob(blob, filename);
        toast.success(t("downloaded"));
      } else {
        const file = new File([blob], filename, { type: "image/png" });
        await navigator.share({ files: [file], title: song.title });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("failed"));
    } finally {
      setBusy(null);
    }
  };

  const canCopy =
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    !!navigator.clipboard?.write;
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({
      files: [new File([], "a.png", { type: "image/png" })],
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <Segmented
              label={t("theme")}
              value={options.theme}
              onChange={(theme) => set({ theme })}
              options={[
                { value: "light", label: t("light") },
                { value: "dark", label: t("dark") },
              ]}
            />
            <Segmented
              label={t("format")}
              value={options.width}
              onChange={(width) => set({ width })}
              options={[
                { value: "portrait", label: t("portrait") },
                { value: "wide", label: t("wide") },
              ]}
            />
            <div className="space-y-1.5 pt-1">
              <Option
                label={t("chords")}
                checked={options.chords}
                onChange={(chords) => set({ chords })}
              />
              <Option
                label={t("lyrics")}
                checked={options.lyrics}
                onChange={(lyrics) => set({ lyrics })}
              />
              <Option
                label={t("legendOption")}
                checked={options.legend}
                onChange={(legend) => set({ legend })}
              />
              <Option
                label={t("notesOption")}
                checked={options.notes}
                onChange={(notes) => set({ notes })}
              />
              <Option
                label={t("summaryOption")}
                checked={options.summary}
                onChange={(summary) => set({ summary })}
              />
            </div>
          </div>

          <div
            ref={setFrame}
            className="bg-muted/40 focus-visible:ring-ring max-h-[55vh] min-h-48 overflow-auto rounded-lg border p-0 focus-visible:ring-2 focus-visible:outline-none md:max-h-[62vh]"
            // A named, focusable region: the preview scrolls, and keyboard
            // users need to be able to scroll it too.
            role="region"
            tabIndex={0}
            aria-label={t("preview")}
          >
            <div
              style={{
                height: preview.height,
                width: "100%",
                overflow: "hidden",
              }}
            >
              <div
                ref={nodeRef}
                style={{
                  width: WIDTH[options.width],
                  transform: `scale(${preview.scale})`,
                  transformOrigin: "top left",
                }}
              >
                <ExportSheet
                  song={song}
                  analysis={analysis}
                  lines={lines}
                  chords={chords}
                  options={options}
                  author={author}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          {canShare && (
            <Button
              variant="outline"
              onClick={() => run("share")}
              disabled={busy !== null}
              className="gap-2"
            >
              {busy === "share" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {t("share")}
            </Button>
          )}
          {canCopy && (
            <Button
              variant="outline"
              onClick={() => run("copy")}
              disabled={busy !== null}
              className="gap-2"
            >
              {busy === "copy" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {t("copy")}
            </Button>
          )}
          <Button
            onClick={() => run("download")}
            disabled={busy !== null}
            className="gap-2"
          >
            {busy === "download" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
