"use client";

import { useId, useRef, useState, useTransition, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  FileMusic,
  FileUp,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import type { Artist } from "@/types/api";
import type { ChordProPreview } from "@/types/content";
import { importChordPro } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import {
  CHORDPRO_ACCEPT,
  CHORDPRO_MAX_BYTES,
  checkChordProFile,
  utf8Size,
} from "@/lib/chordpro-file";
import { cn, formatDuration } from "@/lib/utils";

interface ImportChordProDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artists: Artist[];
  /** `hasFeature(entitlements, "chordpro_import")`. */
  allowed: boolean;
}

/** Known warning codes (anything else gets the generic sentence). */
const WARNING_CODES = new Set([
  "album_dropped",
  "artist_truncated",
  "braces_removed",
  "directive_dropped",
  "duplicate_directive",
  "invalid_capo",
  "invalid_chord",
  "invalid_duration",
  "invalid_key",
  "invalid_tempo",
  "invalid_time",
  "title_truncated",
  "unbalanced_bracket",
  "too_many_warnings",
]);

const NEW_ARTIST = "__new__";

/**
 * "Importar ChordPro": pick a file (or paste the text), check the preview
 * the API parsed (a dry run: nothing is saved), choose the artist and
 * confirm.
 */
export function ImportChordProDialog(props: ImportChordProDialogProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {props.isOpen && <ImportFlow {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportFlow({ onClose, artists, allowed }: ImportChordProDialogProps) {
  const t = useTranslations("chordproImport");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<"file" | "paste">("file");
  const [pasted, setPasted] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChordProPreview | null>(null);
  const [title, setTitle] = useState("");
  const [artistChoice, setArtistChoice] = useState("");
  const [newArtistName, setNewArtistName] = useState("");
  const [isPending, startTransition] = useTransition();

  const sortedArtists = [...artists].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const runPreview = (text: string) => {
    startTransition(async () => {
      const result = await importChordPro({ content: text }, true);
      if (!result.success || !result.data) {
        toastActionError(
          result,
          (!result.success && result.error) || t("previewFailed"),
        );
        return;
      }
      const data = result.data;
      setContent(text);
      setPreview(data);
      setTitle(data.title);
      const match = data.artist_name
        ? artists.find(
            (a) =>
              a.name.localeCompare(data.artist_name ?? "", undefined, {
                sensitivity: "base",
              }) === 0,
          )
        : undefined;
      setArtistChoice(match ? match.id : data.artist_name ? NEW_ARTIST : "");
      setNewArtistName(match ? "" : (data.artist_name ?? ""));
    });
  };

  const readFile = async (file: File) => {
    setFileError(null);
    const issue = checkChordProFile(file);
    if (issue) {
      setFileName(null);
      setFileError(
        t(`fileIssues.${issue}`, { max: CHORDPRO_MAX_BYTES / 1024 }),
      );
      return;
    }
    setFileName(file.name);
    try {
      runPreview(await file.text());
    } catch {
      setFileError(t("fileIssues.unreadable"));
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  };

  const pastedTooLarge = utf8Size(pasted) > CHORDPRO_MAX_BYTES;

  const confirm = () => {
    if (!content || !preview) return;
    const artistId =
      artistChoice && artistChoice !== NEW_ARTIST ? artistChoice : undefined;
    const artistName =
      artistChoice === NEW_ARTIST ? newArtistName.trim() : undefined;
    if (!artistId && !artistName) {
      toast.error(t("artistRequired"));
      return;
    }
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }

    startTransition(async () => {
      const result = await importChordPro(
        {
          content,
          artist_id: artistId,
          artist_name: artistName,
          title: title.trim() !== preview.title ? title.trim() : undefined,
        },
        false,
      );
      if (!result.success || !result.data) {
        toastActionError(
          result,
          (!result.success && result.error) || t("importFailed"),
        );
        return;
      }
      const songId = result.data.id;
      toast.success(t("imported", { title: result.data.title }), {
        action: {
          label: t("openSong"),
          onClick: () => router.push(`/dashboard/songs/${songId}`),
        },
      });
      onClose();
    });
  };

  if (!allowed) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <UpgradeHint message={t("locked")} className="py-4 text-sm" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("close")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (preview && content) {
    const facts: Array<[string, string | null]> = [
      [t("preview.key"), preview.tonality],
      [t("preview.bpm"), preview.tempo != null ? String(preview.tempo) : null],
      [t("preview.timeSignature"), preview.time_signature],
      [
        t("preview.capo"),
        preview.capo != null
          ? preview.capo === 0
            ? t("preview.noCapo")
            : t("preview.capoFret", { fret: preview.capo })
          : null,
      ],
      [
        t("preview.duration"),
        preview.duration ? formatDuration(preview.duration) : null,
      ],
    ];

    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("preview.title")}</DialogTitle>
          <DialogDescription>{t("preview.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${inputId}-title`}>
                {t("preview.songTitle")}
              </Label>
              <Input
                id={`${inputId}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${inputId}-artist`}>{t("preview.artist")}</Label>
              <NativeSelect
                id={`${inputId}-artist`}
                value={artistChoice}
                onChange={(e) => setArtistChoice(e.target.value)}
                disabled={isPending}
              >
                <option value="" disabled>
                  {t("preview.selectArtist")}
                </option>
                <option value={NEW_ARTIST}>{t("preview.newArtist")}</option>
                {sortedArtists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name}
                  </option>
                ))}
              </NativeSelect>
              {artistChoice === NEW_ARTIST && (
                <Input
                  aria-label={t("preview.newArtistName")}
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder={t("preview.newArtistName")}
                  maxLength={255}
                  disabled={isPending}
                />
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="bg-muted/40 rounded-lg border px-3 py-2"
              >
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="font-mono text-sm font-medium">
                  {value ?? <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            ))}
          </dl>

          {preview.warnings.length > 0 && (
            <section
              aria-labelledby={`${inputId}-warnings`}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
            >
              <h3
                id={`${inputId}-warnings`}
                className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200"
              >
                <TriangleAlert className="h-4 w-4" aria-hidden />
                {t("warnings.title", { count: preview.warnings.length })}
              </h3>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
                {preview.warnings.map((warning, index) => (
                  <li key={index} className="flex gap-2">
                    {warning.line != null && (
                      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                        {t("warnings.line", { line: warning.line })}
                      </span>
                    )}
                    <span>
                      {WARNING_CODES.has(warning.code)
                        ? t(`warnings.codes.${warning.code}`, {
                            detail: warning.detail ?? "",
                          })
                        : t("warnings.codes.other")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby={`${inputId}-lyrics`} className="space-y-2">
            <h3 id={`${inputId}-lyrics`} className="text-sm font-semibold">
              {t("preview.lyrics")}
            </h3>
            <div className="bg-card max-h-80 overflow-y-auto rounded-lg border p-4">
              {preview.lyrics?.trim() ? (
                <ChordProRenderer content={preview.lyrics} fontSize={0.95} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("preview.noLyrics")}
                </p>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPreview(null);
              setContent(null);
            }}
            disabled={isPending}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
            {t("back")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirm} disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("confirm")}
            </Button>
          </div>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>

      <Tabs
        value={source}
        onValueChange={(value) => setSource(value as "file" | "paste")}
        className="py-2"
      >
        <TabsList>
          <TabsTrigger value="file">{t("tabs.file")}</TabsTrigger>
          <TabsTrigger value="paste">{t("tabs.paste")}</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-2 pt-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <FileMusic className="text-muted-foreground h-8 w-8" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("dropTitle")}</p>
              <p className="text-muted-foreground text-xs">
                {t("dropHint", { max: CHORDPRO_MAX_BYTES / 1024 })}
              </p>
            </div>
            <input
              ref={fileInput}
              id={`${inputId}-file`}
              type="file"
              accept={CHORDPRO_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={isPending}
              aria-describedby={fileError ? `${inputId}-file-error` : undefined}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileUp className="mr-2 h-4 w-4" aria-hidden />
              )}
              {t("chooseFile")}
            </Button>
            {fileName && !fileError && (
              <p className="text-muted-foreground text-xs">
                {t("reading", { name: fileName })}
              </p>
            )}
            {fileError && (
              <p
                id={`${inputId}-file-error`}
                role="alert"
                className="text-destructive text-sm"
              >
                {fileError}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paste" className="space-y-2 pt-2">
          <Label htmlFor={`${inputId}-paste`}>{t("pasteLabel")}</Label>
          <Textarea
            id={`${inputId}-paste`}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={10}
            className="font-mono text-sm"
            placeholder={
              "{title: Asa Branca}\n{artist: Luiz Gonzaga}\n{key: G}\n\n[G]Quando olhei a [C]terra ardendo"
            }
            disabled={isPending}
            aria-invalid={pastedTooLarge}
            aria-describedby={`${inputId}-paste-hint`}
          />
          <p
            id={`${inputId}-paste-hint`}
            className={cn(
              "text-xs",
              pastedTooLarge ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {pastedTooLarge
              ? t("fileIssues.size", { max: CHORDPRO_MAX_BYTES / 1024 })
              : t("pasteHint")}
          </p>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => runPreview(pasted)}
              disabled={isPending || !pasted.trim() || pastedTooLarge}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("previewButton")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          {tCommon("cancel")}
        </Button>
      </DialogFooter>
    </>
  );
}
