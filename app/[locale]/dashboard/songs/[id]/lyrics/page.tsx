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
import { readCachedSong } from "@/lib/offline/read";
import { isKnownOffline } from "@/lib/offline/navigation";
import { Song } from "@/types/api";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { toast } from "sonner";
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
  HelpCircle,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  setText: (v: string) => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);
  const replacement = selected
    ? `${prefix}${selected}${suffix}`
    : `${prefix}text${suffix}`;
  const next = value.slice(0, start) + replacement + value.slice(end);
  setText(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const newStart = selected ? start + prefix.length : start + prefix.length;
    const newEnd = selected
      ? end + prefix.length
      : start + prefix.length + "text".length;
    textarea.setSelectionRange(newStart, newEnd);
  });
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  insertion: string,
  setText: (v: string) => void,
  cursorOffset?: number,
) {
  const { selectionStart: start, value } = textarea;
  const next = value.slice(0, start) + insertion + value.slice(start);
  setText(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + (cursorOffset ?? insertion.length);
    textarea.setSelectionRange(pos, pos);
  });
}

// ChordPopover

const COMMON_CHORDS = [
  "C",
  "Cm",
  "C7",
  "Cmaj7",
  "D",
  "Dm",
  "D7",
  "Dmaj7",
  "E",
  "Em",
  "E7",
  "F",
  "Fm",
  "F7",
  "Fmaj7",
  "G",
  "Gm",
  "G7",
  "Gmaj7",
  "A",
  "Am",
  "A7",
  "Amaj7",
  "B",
  "Bm",
  "B7",
  "Bb",
  "Bbm",
  "Bb7",
  "Eb",
  "Ebm",
  "Ab",
  "Abm",
];

interface ChordPopoverProps {
  onInsert: (chord: string) => void;
}

function ChordPopover({ onInsert }: ChordPopoverProps) {
  const t = useTranslations("lyrics.toolbar");
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          title={t("insertChord")}
        >
          <Music className="h-3.5 w-3.5" />
          {t("chord")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("customChord")}</Label>
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={t("customChordPlaceholder")}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim()) {
                    onInsert(custom.trim());
                    setCustom("");
                    setOpen(false);
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8"
                disabled={!custom.trim()}
                onClick={() => {
                  onInsert(custom.trim());
                  setCustom("");
                  setOpen(false);
                }}
              >
                OK
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              {t("commonChords")}
            </Label>
            <div className="flex flex-wrap gap-1">
              {COMMON_CHORDS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onInsert(c);
                    setOpen(false);
                  }}
                  className="bg-muted hover:bg-accent hover:text-accent-foreground rounded px-2 py-0.5 font-mono text-xs transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Help

function HelpPopover() {
  const t = useTranslations("lyrics.help");
  const rows: Array<[string, string]> = [
    ["[Am]Hello [G]world", t("inlineChords")],
    ["[Refrão]  /  Pré-Refrão:", t("sections")],
    ["{soc} … {eoc}", t("environments")],
    ["{c: …}", t("comment")],
    ["**b**  *i*  __u__", t("formatting")],
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t("title")}
          aria-label={t("title")}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[22rem] max-w-[calc(100vw-2rem)] p-4"
        align="end"
      >
        <h4 className="mb-1 font-semibold">{t("title")}</h4>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          {t("intro")}
        </p>
        <dl className="space-y-2.5">
          {rows.map(([code, description]) => (
            <div key={code} className="space-y-1">
              <dt className="bg-muted w-fit rounded px-1.5 py-0.5 font-mono text-xs">
                {code}
              </dt>
              <dd className="text-muted-foreground text-xs leading-snug">
                {description}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
          {t("pasteTip")}
        </p>
      </PopoverContent>
    </Popover>
  );
}

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
  const [confirmLeave, setConfirmLeave] = useState(false);
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

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const result = await updateSong(id, { lyrics });
      if (result.success) {
        setSavedLyrics(lyrics);
        toast.success(t("saved"));
        router.back();
      } else {
        toastActionError(result, result.error ?? t("saveFailed"));
      }
    });
  }, [id, lyrics, router, t]);

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

  // Unsaved changes

  const isDirty = !isReadOnly && lyrics !== savedLyrics;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const handleLeave = useCallback(() => {
    if (isDirty) setConfirmLeave(true);
    else router.back();
  }, [isDirty, router]);

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
            aria-label={tCommon("cancel")}
          >
            <ArrowLeft className="h-4 w-4" />
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
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="gap-1.5"
              title={isDirty ? undefined : t("noChanges")}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isPending ? t("saving") : t("save")}
            </Button>
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
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyItalic}
          title={t("toolbar.italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyUnderline}
          title={t("toolbar.underline")}
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
              <Music className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("toolbar.chords")}</span>
            </Button>
            <Button
              variant={showSections ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowSections((v) => !v)}
              aria-pressed={showSections}
              title={t("toolbar.sections")}
            >
              <ListTree className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("toolbar.sections")}</span>
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
            className={cn(
              "bg-background flex-1 resize-none p-4 font-mono text-sm leading-relaxed focus:outline-none",
              "placeholder:text-muted-foreground/50",
            )}
            placeholder={t("placeholder")}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            readOnly={isReadOnly}
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

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("discardTitle")}</DialogTitle>
            <DialogDescription>{t("discardDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              {t("keepEditing")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmLeave(false);
                router.back();
              }}
            >
              {t("discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
