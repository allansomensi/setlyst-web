"use client";

import {
  useEffect,
  useState,
  useTransition,
  use,
  useRef,
  useCallback,
} from "react";
import { useAppRouter } from "@/hooks/use-app-router";
import { Button } from "@/components/ui/button";
import { updateSong } from "../../actions";
import { useApi } from "@/lib/api-client";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { insertAtCursor, wrapSelection } from "./_components/text-editing";
import { ChordPopover, HelpPopover } from "./_components/toolbar-popovers";
import { readCachedSong } from "@/lib/offline/read";
import { isKnownOffline } from "@/lib/offline/navigation";
import { Song } from "@/types/api";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { useTranslations } from "next-intl";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";
import { LyricsEditorSkeleton } from "@/components/page-skeletons";
import {
  Loader2,
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Music,
  Eye,
  EyeOff,
  Underline,
  ChevronDown,
  Check,
  WifiOff,
  ListTree,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Sections offered in the editor's menu, most used first. */
const INSERTABLE_SECTIONS = [
  "intro",
  "verse",
  "preChorus",
  "chorus",
  "postChorus",
  "bridge",
  "solo",
  "instrumental",
  "interlude",
  "riff",
  "break",
  "outro",
] as const;

// Main Page

interface EditLyricsPageProps {
  params: Promise<{ id: string }>;
}

export default function EditLyricsPage({ params }: EditLyricsPageProps) {
  const { id } = use(params);
  const router = useAppRouter();
  const { fetchApi } = useApi();
  const t = useTranslations("lyrics");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [songTitle, setSongTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  // Side by side on wide screens. On a phone the two can't share the
  // width, so the preview replaces the editor instead — and it starts on
  // the editor, since that's what this page is for.
  const [showPreview, setShowPreview] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 768px)").matches,
  );
  const [showChords, setShowChords] = useState(true);
  const [showSections, setShowSections] = useState(true);
  const [savedLyrics, setSavedLyrics] = useState("");
  // Someone else saved different lyrics since this editor loaded them:
  // saving now would silently overwrite their version, so ask first.
  const [conflict, setConflict] = useState<{
    lyrics: string;
    by: string | null;
    close: boolean;
  } | null>(null);
  // True when what's on screen came from the on-device copy rather than the
  // API. The lyrics are fully readable either way; saving is what needs a
  // connection, so the editor turns read-only instead of offering a Save
  // button that can only fail.
  const [isReadOnly, setIsReadOnly] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    hasLoaded.current = false;
  }, [id]);

  useEffect(() => {
    if (hasLoaded.current) return;

    let mounted = true;

    async function load() {
      const apply = (song: Song, fromCache: boolean) => {
        setLyrics(song.lyrics ?? "");
        setSavedLyrics(song.lyrics ?? "");
        setSongTitle(song.title);
        setIsReadOnly(fromCache);
        hasLoaded.current = !fromCache;
      };

      // With no connection, don't spend a doomed request (and its retries)
      // before falling back — go straight to the on-device copy.
      if (isKnownOffline()) {
        const cached = await readCachedSong(id);
        if (mounted) {
          if (cached) {
            apply(cached, true);
          } else {
            toast.error(t("loadFailedOffline"));
          }
          setIsLoading(false);
        }
        return;
      }

      try {
        const song = await fetchApi<Song>(`/songs/${id}`);
        if (mounted) apply(song, false);
      } catch {
        // The request failed — but the lyrics may well be saved on this
        // device. Showing them read-only is far better than bouncing
        // someone back to the song list, which is what used to happen the
        // moment the API hiccuped or the signal dropped mid-load.
        const cached = await readCachedSong(id);
        if (mounted) {
          if (cached) {
            apply(cached, true);
          } else {
            toast.error(t("loadFailed"));
            router.push("/dashboard/songs");
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [id, fetchApi, router, t]);

  /**
   * Where the editor leaves to: the song's detail page, or its Live Mode
   * when working from the offline copy (the detail page needs the API,
   * Live Mode works from the device).
   */
  const songHref = isReadOnly
    ? `/dashboard/songs/${id}/live`
    : `/dashboard/songs/${id}`;

  const isDirty = !isReadOnly && lyrics !== savedLyrics;
  const guard = useUnsavedChangesGuard(isDirty);

  /**
   * Saves the lyrics. Ctrl/Cmd+S and "Salvar" stay in the editor (people
   * save as they go); "Salvar e fechar" goes back to the song.
   *
   * The API has no version check on PATCH, so before writing, the song is
   * read again: if its lyrics are no longer the ones this editor started
   * from (a bandmate, or this account on another device, saved in the
   * meantime), the save stops and asks instead of overwriting their work.
   */
  const save = useCallback(
    (options: { close: boolean; force?: boolean }) => {
      if (isPending || isReadOnly) return;
      if (!isDirty) {
        if (options.close) {
          guard.release();
          router.push(songHref);
        }
        return;
      }
      startTransition(async () => {
        if (!options.force) {
          const current = await fetchApi<Song>(`/songs/${id}`).catch(
            () => null,
          );
          // Can't check (a blip): go ahead rather than block the save.
          if (current && (current.lyrics ?? "") !== savedLyrics) {
            setConflict({
              lyrics: current.lyrics ?? "",
              by: current.updated_by_username ?? null,
              close: options.close,
            });
            return;
          }
        }
        const saving = lyrics;
        const result = await updateSong(id, { lyrics: saving });
        if (!result.success) {
          toastActionError(result, result.error ?? t("saveFailed"));
          return;
        }
        setSavedLyrics(saving);
        setConflict(null);
        if (options.close) {
          toast.success(t("saved"));
          guard.release();
          router.push(songHref);
        } else {
          toast.success(t("savedInPlace"), { duration: 2000 });
        }
      });
    },
    [
      id,
      lyrics,
      savedLyrics,
      router,
      t,
      isPending,
      isReadOnly,
      isDirty,
      guard,
      songHref,
      fetchApi,
    ],
  );

  const handleSave = useCallback(() => save({ close: false }), [save]);
  const handleSaveAndClose = useCallback(() => save({ close: true }), [save]);

  // Toolbar actions

  const applyBold = useCallback(() => {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, "**", "**", setLyrics);
  }, []);

  const applyItalic = useCallback(() => {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, "*", "*", setLyrics);
  }, []);

  const applyUnderline = useCallback(() => {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, "__", "__", setLyrics);
  }, []);

  const insertChord = useCallback((chord: string) => {
    if (textareaRef.current)
      insertAtCursor(textareaRef.current, `[${chord}]`, setLyrics);
  }, []);

  const insertSection = useCallback((template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Headings only work on a line of their own.
    const before = textarea.value.slice(0, textarea.selectionStart);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    insertAtCursor(textarea, prefix + template, setLyrics);
  }, []);

  const handleLeave = useCallback(() => {
    guard.requestLeave(() => router.push(songHref));
  }, [guard, router, songHref]);

  // Keyboard shortcuts

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === "b") {
          e.preventDefault();
          applyBold();
        }
        if (e.key === "i") {
          e.preventDefault();
          applyItalic();
        }
        if (e.key === "u") {
          e.preventDefault();
          applyUnderline();
        }
        if (e.key === "s") {
          e.preventDefault();
          handleSave();
        }
      }
    },
    [applyBold, applyItalic, applyUnderline, handleSave],
  );

  if (isLoading) {
    return <LyricsEditorSkeleton />;
  }

  return (
    // Edge to edge: cancels the dashboard's page padding and fills the
    // scroll area exactly, instead of a 100vh guess that overflowed it.
    <div className="-m-4 flex h-[calc(100%+2rem)] min-h-[28rem] flex-col md:-m-8 md:h-[calc(100%+4rem)]">
      {/* Header */}
      <div className="bg-background flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleLeave}
            className="shrink-0"
            aria-label={tCommon("back")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base leading-tight font-semibold md:text-lg">
              {songTitle}
            </h1>
            <PageBreadcrumbs
              compact
              items={[
                { label: tNav("songs"), href: "/dashboard/songs" },
                { label: t("editTitle") },
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            disabled={isPending}
            className="hidden sm:inline-flex"
          >
            {tCommon("cancel")}
          </Button>
          {isReadOnly ? (
            // Read-only because this came from the offline copy. Saying so
            // plainly beats a Save button that could only ever fail.
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              {t("readOnlyOffline")}
            </span>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={isPending || !isDirty}
                className="gap-1.5"
                title={isDirty ? t("saveShortcut") : t("noChanges")}
                aria-keyshortcuts="Control+S Meta+S"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-3.5 w-3.5" aria-hidden />
                )}
                {isPending ? t("saving") : t("save")}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndClose}
                disabled={isPending}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{t("saveAndClose")}</span>
                <span className="sm:hidden">{t("saveAndCloseShort")}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-muted/30 flex flex-wrap items-center gap-1 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyBold}
          title={t("toolbar.bold")}
          aria-label={t("toolbar.bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyItalic}
          title={t("toolbar.italic")}
          aria-label={t("toolbar.italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyUnderline}
          title={t("toolbar.underline")}
          aria-label={t("toolbar.underline")}
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <div className="bg-border mx-1 h-5 w-px" />

        <ChordPopover onInsert={insertChord} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              {t("toolbar.section")}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-52">
            {INSERTABLE_SECTIONS.map((key) => (
              <DropdownMenuItem
                key={key}
                onClick={() => insertSection(`[${t(`toolbar.${key}`)}]\n`)}
              >
                {t(`toolbar.${key}`)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => insertSection(`{c: ${t("commentPlaceholder")}}\n`)}
            >
              {t("toolbar.comment")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="bg-border mx-1 h-5 w-px" />

        <Button
          variant={showPreview ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowPreview((v) => !v)}
          title={t("toolbar.preview")}
        >
          {showPreview ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {t("preview")}
        </Button>

        {showPreview && (
          <>
            <Button
              variant={showChords ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowChords((v) => !v)}
              aria-pressed={showChords}
              title={t("toolbar.chords")}
            >
              <Music className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">
                {t("toolbar.chords")}
              </span>
            </Button>
            <Button
              variant={showSections ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowSections((v) => !v)}
              aria-pressed={showSections}
              title={t("toolbar.sections")}
            >
              <ListTree className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">
                {t("toolbar.sections")}
              </span>
            </Button>
          </>
        )}

        <div className="ml-auto">
          <HelpPopover />
        </div>
      </div>

      {/* Editor + Preview */}
      <div
        className={cn(
          "flex flex-1 overflow-hidden",
          showPreview ? "divide-x" : "",
        )}
      >
        {/* Editor */}
        <div
          className={cn(
            "flex min-w-0 flex-col",
            showPreview ? "hidden md:flex md:w-1/2" : "w-full",
          )}
        >
          <textarea
            ref={textareaRef}
            aria-label={t("editorLabel", { title: songTitle })}
            className={cn(
              // 16px on phones: anything smaller makes iOS zoom the page
              // when the field is focused.
              "bg-background flex-1 resize-none p-4 font-mono text-base leading-relaxed outline-none md:text-sm",
              "focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:ring-inset",
              "placeholder:text-muted-foreground/50",
            )}
            placeholder={t("placeholder")}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            onKeyDown={handleKeyDown}
            // Read-only (not disabled) while saving, so the caret and focus
            // stay put after Ctrl+S.
            readOnly={isReadOnly || isPending}
            aria-busy={isPending || undefined}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
          <div className="text-muted-foreground border-t px-4 py-1.5 text-xs">
            {t("stats", {
              lines: lyrics.split("\n").length,
              chars: lyrics.length,
            })}
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="bg-muted/20 w-full overflow-y-auto p-4 md:w-1/2 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {t("preview")}
              </span>
            </div>
            <ChordProRenderer
              content={lyrics}
              showChords={showChords}
              showSections={showSections}
              fontSize={1}
              fontFamily="sans"
            />
          </div>
        )}
      </div>

      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => !open && !isPending && setConflict(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("conflict.title")}</DialogTitle>
            <DialogDescription>
              {conflict?.by
                ? t("conflict.descriptionBy", { user: conflict.by })
                : t("conflict.description")}
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{t("conflict.hint")}</p>
          <DialogFooter className="sm:flex-wrap">
            <Button
              variant="outline"
              onClick={() => setConflict(null)}
              disabled={isPending}
            >
              {t("keepEditing")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!conflict) return;
                // Their version becomes both the text and the new baseline.
                setLyrics(conflict.lyrics);
                setSavedLyrics(conflict.lyrics);
                setConflict(null);
              }}
              disabled={isPending}
            >
              {t("conflict.loadTheirs")}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                save({ close: conflict?.close ?? false, force: true })
              }
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("conflict.overwrite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={guard.isConfirming}
        onOpenChange={(open) => !open && guard.cancelLeave()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("discardTitle")}</DialogTitle>
            <DialogDescription>{t("discardDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={guard.cancelLeave}>
              {t("keepEditing")}
            </Button>
            <Button variant="destructive" onClick={guard.confirmLeave}>
              {t("discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
