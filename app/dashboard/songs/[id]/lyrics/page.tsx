"use client";

import {
  useEffect,
  useState,
  useTransition,
  use,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateSong } from "../../actions";
import { useApi } from "@/lib/api-client";
import { Song } from "@/types/api";
import { ChordProRenderer } from "@/components/lyrics/chord-pro-renderer";
import { toast } from "sonner";
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
} from "lucide-react";
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
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          title="Insert chord"
        >
          <Music className="h-3.5 w-3.5" />
          Chord
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Custom chord</Label>
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="E.g.: Am7, Gsus4"
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
              Common chords
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

// Help Dialog

function HelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="ChordPro Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <h4 className="mb-3 font-semibold">ChordPro Format</h4>
        <div className="text-muted-foreground space-y-2 text-sm">
          <div className="bg-muted rounded px-2 py-1 font-mono text-xs">
            [Am]Song [G]lyrics
          </div>
          <p className="text-xs">Chords in brackets before the syllable</p>
          <hr className="my-2" />
          <div className="space-y-1 font-mono text-xs">
            <div>
              <span className="text-foreground">**text**</span> →{" "}
              <strong>bold</strong>
            </div>
            <div>
              <span className="text-foreground">*text*</span> → <em>italic</em>
            </div>
            <div>
              <span className="text-foreground">__text__</span> →{" "}
              <u>underline</u>
            </div>
          </div>
          <hr className="my-2" />
          <div className="text-foreground space-y-1 font-mono text-xs">
            <div>
              {"{"}
              <span className="text-primary">soc</span>
              {"}"} / {"{"}
              <span className="text-primary">eoc</span>
              {"}"} — Chorus
            </div>
            <div>
              {"{"}
              <span className="text-primary">sov: Verse 1</span>
              {"}"} — Verse
            </div>
            <div>
              {"{"}
              <span className="text-primary">sob</span>
              {"}"} — Bridge
            </div>
            <div>
              {"{"}
              <span className="text-primary">c: comment</span>
              {"}"} — Note
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Main Page

interface EditLyricsPageProps {
  params: Promise<{ id: string }>;
}

export default function EditLyricsPage({ params }: EditLyricsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchApi } = useApi();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [songTitle, setSongTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showChords, setShowChords] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const song = await fetchApi<Song>(`/songs/${id}`);
        if (mounted) {
          setLyrics(song.lyrics ?? "");
          setSongTitle(song.title);
        }
      } catch {
        toast.error("Error loading lyrics");
        router.push("/dashboard/songs");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, fetchApi, router]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateSong(id, { lyrics });
      if (result.success) {
        toast.success("Lyrics saved successfully!");
        router.back();
      } else {
        toast.error(result.error ?? "Error saving lyrics");
      }
    });
  };

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
    if (textareaRef.current)
      insertAtCursor(textareaRef.current, template, setLyrics);
  }, []);

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
    [applyBold, applyItalic, applyUnderline],
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base leading-tight font-semibold md:text-lg">
              {songTitle}
            </h1>
            <p className="text-muted-foreground text-xs">Edit Lyrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-muted/30 flex flex-wrap items-center gap-1 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyBold}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyItalic}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={applyUnderline}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <div className="bg-border mx-1 h-5 w-px" />

        <ChordPopover onInsert={insertChord} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              Section
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => insertSection("{soc}\n\n{eoc}\n")}>
              Chorus
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => insertSection("{sov: Verse 1}\n\n{eov}\n")}
            >
              Verse
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSection("{sob}\n\n{eob}\n")}>
              Bridge
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => insertSection("{c: comment here}\n")}
            >
              Comment / Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="bg-border mx-1 h-5 w-px" />

        <Button
          variant={showPreview ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowPreview((v) => !v)}
          title="Toggle preview"
        >
          {showPreview ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          Preview
        </Button>

        {showPreview && (
          <Button
            variant={showChords ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowChords((v) => !v)}
            title="Show/hide chords in preview"
          >
            <Music className="h-3.5 w-3.5" />
            Chords
          </Button>
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
        <div className={cn("flex flex-col", showPreview ? "w-1/2" : "w-full")}>
          <textarea
            ref={textareaRef}
            className={cn(
              "bg-background flex-1 resize-none p-4 font-mono text-sm leading-relaxed focus:outline-none",
              "placeholder:text-muted-foreground/50",
            )}
            placeholder={`[Am]Type the [G]lyrics in ChordPro format\n\n{soc}\n[Am]Chorus [G]here\n{eoc}\n\n**Bold**, *italic*, __underline__`}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          />
          <div className="text-muted-foreground border-t px-4 py-1.5 text-xs">
            {lyrics.split("\n").length} lines · {lyrics.length} characters
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="bg-muted/20 w-1/2 overflow-y-auto p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Preview
              </span>
            </div>
            <ChordProRenderer
              content={lyrics}
              showChords={showChords}
              fontSize={1}
              fontFamily="sans"
            />
          </div>
        )}
      </div>
    </div>
  );
}
