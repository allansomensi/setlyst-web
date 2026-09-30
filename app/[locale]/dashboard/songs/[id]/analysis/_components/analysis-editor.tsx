"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  CloudOff,
  Eye,
  FileEdit,
  ImageDown,
  Info,
  Loader2,
  MoreHorizontal,
  Redo2,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Link } from "@/components/nav-link";
import { useAppRouter } from "@/hooks/use-app-router";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { ChordDiagramHost } from "@/components/chords/chord-diagram-popover";
import {
  AnalysisSheet,
  type PendingPick,
} from "@/components/analysis/analysis-sheet";
import {
  AnalysisInspector,
  type InspectorActions,
} from "@/components/analysis/analysis-inspector";
import {
  AnalysisFootnotes,
  AnalysisLegend,
} from "@/components/analysis/analysis-legend";
import { AnalysisExportDialog } from "@/components/analysis/analysis-export-dialog";
import { AnalysisPatterns } from "@/components/analysis/analysis-reading";
import { findPatterns, type Pattern } from "@/lib/music/analysis-concepts";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { onRadioGroupKeyDown } from "@/hooks/radio-group-keys";
import { parseChordPro } from "@/lib/music/chordpro";
import {
  LIMITS,
  addConnection,
  addRangeNote,
  analysisIsEmpty,
  buildSheet,
  clearChord,
  compactAnalysis,
  copyDegree,
  degreeIsSet,
  emptyAnalysis,
  newId,
  normalizeAnalysis,
  reconcile,
  removeConnection,
  removeRangeNote,
  sameChordTargets,
  setEntry,
  setKeyMark,
  updateConnection,
  updateRangeNote,
  type ConnectionKind,
  type HarmonicAnalysis,
  type AnalysisDisplay,
} from "@/lib/music/analysis";
import type { Song, SongAnalysis } from "@/types/api";
import { deleteSongAnalysis, saveSongAnalysis } from "../../../actions";

// History

interface History {
  present: HarmonicAnalysis;
  past: HarmonicAnalysis[];
  future: HarmonicAnalysis[];
  /** Typing in one field joins one undo step (see `group`). */
  group: string | null;
  groupAt: number;
  /** Bumped by every change: what autosave watches. */
  revision: number;
}

type HistoryAction =
  | {
      type: "apply";
      update: (analysis: HarmonicAnalysis) => HarmonicAnalysis;
      group?: string;
    }
  | { type: "undo" }
  | { type: "redo" };

const HISTORY_LIMIT = 200;
const GROUP_WINDOW_MS = 1500;

function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case "apply": {
      const next = action.update(state.present);
      if (next === state.present) return state;
      const now = Date.now();
      const joins =
        !!action.group &&
        action.group === state.group &&
        now - state.groupAt < GROUP_WINDOW_MS;
      return {
        present: next,
        past: joins
          ? state.past
          : [...state.past, state.present].slice(-HISTORY_LIMIT),
        future: [],
        group: action.group ?? null,
        groupAt: now,
        revision: state.revision + 1,
      };
    }
    case "undo": {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
        group: null,
        groupAt: 0,
        revision: state.revision + 1,
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return {
        present: next,
        past: [...state.past, state.present],
        future: rest,
        group: null,
        groupAt: 0,
        revision: state.revision + 1,
      };
    }
  }
}

// Saving

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
const AUTOSAVE_MS = 1200;
const RETRY_MS = 6000;
/** The API's answer when someone else saved in between. */
const ANALYSIS_CONFLICT = "ANALYSIS_CONFLICT";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.getAttribute("role") === "combobox"
  );
}

function SaveIndicator({
  state,
  online,
}: {
  state: SaveState;
  online: boolean;
}) {
  const t = useTranslations("analysis.save");
  if (!online) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        {t("offline")}
      </span>
    );
  }
  const content = {
    saved: {
      icon: <Check className="h-3.5 w-3.5" aria-hidden />,
      text: t("saved"),
      cls: "text-muted-foreground",
    },
    dirty: {
      icon: <span className="bg-chart-2 h-2 w-2 rounded-full" aria-hidden />,
      text: t("dirty"),
      cls: "text-muted-foreground",
    },
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />,
      text: t("saving"),
      cls: "text-muted-foreground",
    },
    error: {
      icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
      text: t("error"),
      cls: "text-destructive",
    },
    conflict: {
      icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
      text: t("conflict"),
      cls: "text-destructive",
    },
  }[state];
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1.5 text-xs", content.cls)}
    >
      {content.icon}
      {content.text}
    </span>
  );
}

// Editor

export function AnalysisEditor({
  song,
  initial,
  canEdit,
}: {
  song: Song;
  initial: SongAnalysis | null;
  canEdit: boolean;
}) {
  const t = useTranslations("analysis");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const online = useOnlineStatus();
  const { data: session } = useSession();

  // The chart, as the analysis sees it.
  const { lines, chordCells } = useMemo(() => {
    const blocks = song.lyrics?.trim() ? parseChordPro(song.lyrics) : [];
    const sheet = buildSheet(blocks);
    return { lines: sheet.lines, chordCells: sheet.chords };
  }, [song.lyrics]);
  const chords = useMemo(
    () => chordCells.map((cell) => cell.symbol),
    [chordCells],
  );
  const songKey = song.tonality ?? null;

  // The stored analysis, re-attached to the chart as it is now.
  const [start] = useState(() => {
    const stored = initial
      ? normalizeAnalysis(initial.content)
      : emptyAnalysis();
    return reconcile(stored, chords);
  });
  const [notice, setNotice] = useState(
    start.changed ? { lost: start.lost } : null,
  );

  const [history, dispatch] = useReducer(historyReducer, {
    present: start.analysis,
    past: [],
    future: [],
    group: null,
    groupAt: 0,
    revision: 0,
  });
  const analysis = history.present;

  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<
    (PendingPick & { connection?: ConnectionKind }) | null
  >(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [editing, setEditing] = useState(canEdit);

  const apply = useCallback(
    (update: (a: HarmonicAnalysis) => HarmonicAnalysis, group?: string) =>
      dispatch({ type: "apply", update, group }),
    [],
  );

  // Autosave

  // The revision last saved (-1: the stored analysis was re-attached to an
  // edited chart, and that version needs saving).
  const [savedRevision, setSavedRevision] = useState(
    start.changed && initial ? -1 : 0,
  );
  const [status, setStatus] = useState<
    "idle" | "saving" | "error" | "conflict"
  >("idle");
  const saveState: SaveState =
    status !== "idle"
      ? status
      : history.revision === savedRevision
        ? "saved"
        : "dirty";

  const baseRef = useRef<string | null>(initial?.updated_at ?? null);
  const savedRef = useRef(savedRevision);
  const inFlight = useRef(false);
  const latest = useRef({ analysis, revision: history.revision });
  useEffect(() => {
    latest.current = { analysis, revision: history.revision };
  }, [analysis, history.revision]);

  const save = useCallback(
    async (force = false) => {
      if (!canEdit || inFlight.current) return;
      const { analysis: doc, revision } = latest.current;
      if (revision === savedRef.current) return;
      inFlight.current = true;
      setStatus("saving");
      const content = compactAnalysis(
        { ...doc, chords: [...chords] },
        chords.length,
      );
      const result = await saveSongAnalysis(
        song.id,
        content,
        force ? null : baseRef.current,
      );
      inFlight.current = false;
      if (result.success && result.data) {
        baseRef.current = result.data.updated_at;
        savedRef.current = revision;
        setSavedRevision(revision);
        setStatus("idle");
        return;
      }
      if (!result.success && result.apiCode === ANALYSIS_CONFLICT) {
        setStatus("conflict");
        return;
      }
      setStatus((previous) => {
        // Said once; the retries that follow stay quiet.
        if (previous !== "error" && !result.success) {
          toastActionError(result, result.error);
        }
        return "error";
      });
    },
    [canEdit, chords, song.id],
  );

  // Changes are saved a moment after the last one; a failed save is
  // retried less eagerly.
  useEffect(() => {
    if (!canEdit || !online) return;
    if (status === "conflict" || status === "saving") return;
    if (history.revision === savedRevision) return;
    const timer = window.setTimeout(
      () => void save(),
      status === "error" ? RETRY_MS : AUTOSAVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [history.revision, savedRevision, status, online, canEdit, save]);

  // Leaving with unsaved work: the browser asks; leaving the page within
  // the app saves on the way out.
  const unsaved = saveState === "dirty" || saveState === "saving";
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => () => void saveRef.current(), []);

  // Selection and picking

  const select = useCallback(
    (index: number | null) => {
      setHighlight(null);
      if (index === null) {
        setSelected(null);
        return;
      }
      setSelected(Math.max(0, Math.min(chords.length - 1, index)));
    },
    [chords.length],
  );

  const onChordClick = useCallback(
    (index: number) => {
      if (pending) {
        if (pending.kind === "connection" && pending.connection) {
          if (index !== pending.from) {
            const kind = pending.connection;
            const from = pending.from;
            const id = newId();
            apply((a) => addConnection(a, from, index, kind, id));
          }
          setPending(null);
          setSelected(pending.from);
          return;
        }
        if (pending.kind === "range") {
          const from = pending.from;
          const id = newId();
          apply((a) => addRangeNote(a, from, index, "amber", id).analysis);
          setPending(null);
          setSelected(from);
          setFocusNote(id);
          return;
        }
      }
      setSelected((current) => (current === index ? null : index));
    },
    [pending, apply],
  );

  // The pick bar's shortcut: the next chord for a line, the same chord
  // for a one-chord passage.
  const nextPickTarget = (pick: PendingPick) =>
    pick.kind === "range"
      ? pick.from
      : Math.min(chords.length - 1, pick.from + 1);

  // The cadences the written degrees form (II–V secundário, dominantes
  // estendidos...): named in the inspector and listed in the overview.
  const patterns = useMemo(
    () => findPatterns(analysis, chords.length),
    [analysis, chords.length],
  );

  const sameTargets = useMemo(
    () =>
      selected === null
        ? []
        : sameChordTargets(analysis, chords, selected, songKey),
    [analysis, chords, selected, songKey],
  );

  const actions: InspectorActions | null = useMemo(() => {
    if (selected === null) return null;
    const i = selected;
    return {
      setEntry: (patch, group) => apply((a) => setEntry(a, i, patch), group),
      clear: () => apply((a) => clearChord(a, i)),
      setKey: (key) => apply((a) => setKeyMark(a, i, key)),
      startConnection: (kind) =>
        setPending({ kind: "connection", from: i, connection: kind }),
      removeConnection: (id) => apply((a) => removeConnection(a, id)),
      setConnectionKind: (id, kind) =>
        apply((a) => updateConnection(a, id, { kind })),
      startRange: () => setPending({ kind: "range", from: i }),
      updateNote: (id, patch, group) =>
        apply((a) => updateRangeNote(a, id, patch), group),
      removeNote: (id) => apply((a) => removeRangeNote(a, id)),
      copyToSame: () => {
        const targets = sameTargets;
        apply((a) => copyDegree(a, i, targets));
        toast.success(t("inspector.copied", { count: targets.length }));
      },
      select: (index) => select(index),
      highlight: setHighlight,
      close: () => select(null),
    };
  }, [selected, apply, sameTargets, select, t]);

  // Keyboard: arrows move between chords, Esc backs out, Delete clears,
  // Ctrl/Cmd+Z undoes.
  useEffect(() => {
    if (!editing) return;
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z" && !isTyping(event.target)) {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "y" && !isTyping(event.target)) {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (isTyping(event.target) || mod || event.altKey) return;
      // Already handled by a focused control (a radio group's or menu's
      // arrows, a popover's Escape): don't also move or drop the chord.
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (pending) setPending(null);
        else select(null);
        return;
      }
      if (selected === null) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        select(selected + 1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        select(selected - 1);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const i = selected;
        apply((a) => clearChord(a, i));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, pending, selected, select, apply]);

  // Keep the selected chord in view (keyboard navigation, footnote links).
  useEffect(() => {
    if (selected === null) return;
    const el = document.querySelector<HTMLElement>(
      `[data-chord-index="${selected}"]`,
    );
    el?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
    if (el && document.activeElement?.hasAttribute("data-chord-index"))
      el.focus({ preventScroll: true });
  }, [selected]);

  const setDisplay = (patch: Partial<AnalysisDisplay>) =>
    apply((a) => ({ ...a, display: { ...a.display, ...patch } }));
  const keepOpen = (event: Event) => event.preventDefault();

  const analysed = useMemo(
    () =>
      chords.filter((_, i) => degreeIsSet(analysis.entries[String(i)]?.degree))
        .length,
    [analysis.entries, chords],
  );
  const empty = analysisIsEmpty(analysis);

  const confirmDelete = () => {
    startDelete(async () => {
      const result = await deleteSongAnalysis(song.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      savedRef.current = history.revision;
      setSavedRevision(history.revision);
      setStatus("idle");
      setDeleteOpen(false);
      toast.success(t("deleted"));
      router.push(`/dashboard/songs/${song.id}`);
    });
  };

  const exportSong = {
    title: song.title,
    artist: song.artist_name ?? null,
    tonality: songKey,
    tempo: song.tempo ?? null,
    timeSignature: song.time_signature ?? null,
  };

  // No chords: nothing to analyse yet.
  if (chords.length === 0) {
    return (
      <div className="space-y-5">
        <EditorTitle song={song} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-lg font-semibold">{t("noChords.title")}</p>
            <p className="text-muted-foreground max-w-md text-sm">
              {t("noChords.description")}
            </p>
            {canEdit && (
              <Button asChild variant="outline" className="mt-2 gap-2">
                <Link href={`/dashboard/songs/${song.id}/lyrics`}>
                  <FileEdit className="h-4 w-4" aria-hidden />
                  {t("noChords.action")}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const inspector =
    editing && selected !== null && actions ? (
      <AnalysisInspector
        key={selected}
        analysis={analysis}
        chords={chords}
        index={selected}
        songKey={songKey}
        sameCount={sameTargets.length}
        patterns={patterns}
        actions={actions}
        focusNote={focusNote}
      />
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <EditorTitle song={song} />

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <SaveIndicator state={saveState} online={online} />
              <div
                className="bg-border mx-1 hidden h-6 w-px sm:block"
                aria-hidden
              />
              <div
                className="bg-muted inline-flex rounded-lg p-0.5"
                role="radiogroup"
                onKeyDown={onRadioGroupKeyDown}
                aria-label={t("mode.label")}
              >
                {([true, false] as const).map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    role="radio"
                    aria-checked={editing === value}
                    onClick={() => {
                      setEditing(value);
                      setPending(null);
                      if (!value) select(null);
                    }}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                      editing === value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value ? (
                      <FileEdit className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {value ? t("mode.edit") : t("mode.view")}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={!history.past.length}
                onClick={() => dispatch({ type: "undo" })}
                aria-label={t("undo")}
                title={t("undoShortcut")}
              >
                <Undo2 className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={!history.future.length}
                onClick={() => dispatch({ type: "redo" })}
                aria-label={t("redo")}
                title={t("redoShortcut")}
              >
                <Redo2 className="h-4 w-4" aria-hidden />
              </Button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">
                  {t("display.title")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              {/* Every choice keeps the menu open: they're tried side by
                  side, watching the chart change behind it. */}
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                {t("display.content")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={analysis.display.showChords ? "both" : "degrees"}
                onValueChange={(value) =>
                  setDisplay({ showChords: value === "both" })
                }
              >
                <DropdownMenuRadioItem value="both" onSelect={keepOpen}>
                  {t("display.chordsAndDegrees")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="degrees" onSelect={keepOpen}>
                  {t("display.degreesOnly")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={analysis.display.showLyrics}
                onCheckedChange={(value) => setDisplay({ showLyrics: !!value })}
                onSelect={keepOpen}
              >
                {t("display.lyrics")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={analysis.display.showFunctions}
                onCheckedChange={(value) =>
                  setDisplay({ showFunctions: !!value })
                }
                onSelect={keepOpen}
              >
                {t("display.functions")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                {t("display.twoFive")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={analysis.display.twoFiveStyle}
                onValueChange={(value) =>
                  setDisplay({
                    twoFiveStyle: value as AnalysisDisplay["twoFiveStyle"],
                  })
                }
              >
                <DropdownMenuRadioItem value="bracket" onSelect={keepOpen}>
                  {t("display.bracket")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="arrow" onSelect={keepOpen}>
                  {t("display.dottedArrow")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {!canEdit && (
                <p className="text-muted-foreground px-2 py-1.5 text-xs">
                  {t("display.readOnlyHint")}
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="h-9 gap-2"
            onClick={() => setExportOpen(true)}
            disabled={empty && !canEdit}
          >
            <ImageDown className="h-4 w-4" aria-hidden />
            <span>{t("exportPng")}</span>
          </Button>

          {canEdit && initial && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={tCommon("moreActions")}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {t("delete.action")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="bg-muted/60 flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm"
        >
          <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="flex-1">
            {notice.lost > 0
              ? t("reconciled.lost", { count: notice.lost })
              : t("reconciled.moved")}
          </p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground rounded p-0.5"
            aria-label={tCommon("close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {saveState === "conflict" && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-lg border px-3 py-3 text-sm sm:flex-row sm:items-center"
        >
          <AlertTriangle
            className="text-destructive h-4 w-4 shrink-0"
            aria-hidden
          />
          <p className="flex-1">{t("conflict.description")}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.refresh()}
            >
              {t("conflict.reload")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setStatus("idle");
                void save(true);
              }}
            >
              {t("conflict.overwrite")}
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid gap-6",
          editing && "lg:grid-cols-[minmax(0,1fr)_22rem]",
        )}
      >
        <Card className="min-w-0 overflow-hidden [--an-halo:var(--card)]">
          <CardContent className="px-4 pt-2 pb-8 sm:px-8">
            {editing && empty && selected === null && (
              <div className="bg-primary/5 border-primary/20 mt-4 mb-2 rounded-lg border px-4 py-3 text-sm">
                <p className="font-semibold">{t("start.title")}</p>
                <p className="text-muted-foreground mt-0.5">
                  {t("start.description")}
                </p>
              </div>
            )}
            <ChordDiagramHost>
              <AnalysisSheet
                lines={lines}
                analysis={analysis}
                songKey={songKey}
                mode={editing ? "edit" : "view"}
                selected={editing ? selected : null}
                pending={pending}
                highlightConnection={highlight}
                onChordClick={editing ? onChordClick : undefined}
                interactiveChords={!editing}
                className="pt-2 text-[1.05rem] sm:text-[1.15rem]"
              />
            </ChordDiagramHost>
          </CardContent>
        </Card>

        {editing && (
          <aside className="hidden lg:block">
            <div className="bg-popover sticky top-0 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border shadow-sm">
              {inspector ?? (
                <Overview
                  analysis={analysis}
                  chords={chords}
                  patterns={patterns}
                  analysed={analysed}
                  canEdit={canEdit}
                  onSummary={(summary) =>
                    apply((a) => ({ ...a, summary }), "summary")
                  }
                  onSelect={select}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {!editing && (
        <Card>
          <CardContent className="grid gap-8 py-6 md:grid-cols-2 xl:grid-cols-3">
            <section>
              <h2 className="text-sm font-semibold">
                {t("reading.patternsTitle")}
              </h2>
              <p className="text-muted-foreground mb-3 text-xs">
                {t("reading.patternsHint")}
              </p>
              <AnalysisPatterns chords={chords} patterns={patterns} />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold">
                {t("overview.legend")}
              </h2>
              <AnalysisLegend analysis={analysis} usedOnly />
              {analysis.connections.length === 0 &&
                !Object.values(analysis.entries).some(
                  (e) => e.badges.length,
                ) && (
                  <p className="text-muted-foreground text-sm">
                    {t("overview.nothingYet")}
                  </p>
                )}
            </section>
            <section className="space-y-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold">
                  {t("overview.notes")}
                </h2>
                <AnalysisFootnotes analysis={analysis} chords={chords} />
                {!analysis.notes.length &&
                  !Object.values(analysis.entries).some((e) =>
                    e.note.trim(),
                  ) && (
                    <p className="text-muted-foreground text-sm">
                      {t("overview.noNotes")}
                    </p>
                  )}
              </div>
              {analysis.summary.trim() && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold">
                    {t("overview.summary")}
                  </h2>
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {analysis.summary}
                  </p>
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      )}

      {/* Phones and tablets: the inspector docks at the bottom of the
          screen, over the chart, which stays scrollable and tappable. */}
      {editing && (inspector || pending) && (
        <div className="sticky bottom-0 z-30 -mx-4 lg:hidden">
          {pending ? (
            <PendingBar
              pending={pending}
              chords={chords}
              onNext={() => onChordClick(nextPickTarget(pending))}
              onCancel={() => setPending(null)}
            />
          ) : (
            <div className="bg-popover max-h-[58dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.35)]">
              <div className="flex justify-center pt-2" aria-hidden>
                <span className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
              </div>
              {inspector}
            </div>
          )}
        </div>
      )}
      {editing && pending && (
        <div className="sticky bottom-4 z-30 hidden justify-center lg:flex">
          <PendingBar
            pending={pending}
            chords={chords}
            onNext={() => onChordClick(nextPickTarget(pending))}
            onCancel={() => setPending(null)}
            floating
          />
        </div>
      )}

      {editing && selected === null && !pending && (
        <p className="text-muted-foreground hidden text-center text-xs lg:block">
          {t("shortcuts")}
        </p>
      )}

      <AnalysisExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        song={exportSong}
        analysis={analysis}
        lines={lines}
        chords={chords}
        author={session?.user?.name ?? initial?.updated_by_username ?? null}
      />

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("delete.title")}
        description={t("delete.description")}
        confirmLabel={t("delete.confirm")}
        onConfirm={confirmDelete}
        pending={isDeleting}
      />
    </div>
  );
}

function EditorTitle({ song }: { song: Song }) {
  const t = useTranslations("analysis");
  const tCommon = useTranslations("common");
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Button
        variant="outline"
        size="icon"
        asChild
        className="hidden shrink-0 sm:inline-flex"
        aria-label={tCommon("back")}
      >
        <Link href={`/dashboard/songs/${song.id}`}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
      <div className="min-w-0">
        <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
          {t("title")}
        </p>
        <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
          {song.title}
          {song.version_label && (
            <Badge
              variant="secondary"
              className="ml-2 align-middle text-xs font-medium"
            >
              {song.version_label}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
          <span>{song.artist_name ?? t("unknownArtist")}</span>
          {song.tonality && (
            <>
              <span aria-hidden>·</span>
              <span>{t("keyOf", { key: song.tonality })}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function PendingBar({
  pending,
  chords,
  onNext,
  onCancel,
  floating = false,
}: {
  pending: PendingPick;
  chords: readonly string[];
  onNext: () => void;
  onCancel: () => void;
  floating?: boolean;
}) {
  const t = useTranslations("analysis.pick");
  const from = chords[pending.from] ?? "";
  return (
    <div
      role="status"
      className={cn(
        "bg-foreground text-background flex items-center gap-3 px-4 py-3 text-sm",
        floating ? "rounded-full shadow-lg" : "rounded-t-2xl",
      )}
    >
      <span className="flex-1">
        {pending.kind === "connection"
          ? t("connection", { chord: from })
          : t("range", { chord: from })}
      </span>
      {pending.from < chords.length - 1 && (
        <Button size="sm" variant="secondary" className="h-8" onClick={onNext}>
          {pending.kind === "connection" ? t("next") : t("justThis")}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-background hover:bg-background/10 hover:text-background h-8"
        onClick={onCancel}
      >
        {t("cancel")}
      </Button>
    </div>
  );
}

function Overview({
  analysis,
  chords,
  patterns,
  analysed,
  canEdit,
  onSummary,
  onSelect,
}: {
  analysis: HarmonicAnalysis;
  chords: readonly string[];
  patterns: readonly Pattern[];
  analysed: number;
  canEdit: boolean;
  onSummary: (summary: string) => void;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("analysis.overview");
  const tReading = useTranslations("analysis.reading");
  const percent = chords.length
    ? Math.round((analysed / chords.length) * 100)
    : 0;
  return (
    <div className="divide-y">
      <section className="space-y-2 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t("progress")}</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("progressCount", { analysed, total: chords.length })}
          </span>
        </div>
        <Progress value={percent} className="h-1.5" />
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
      </section>

      <section className="space-y-2 px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold">{tReading("patternsTitle")}</h2>
          <p className="text-muted-foreground text-xs">
            {tReading("patternsHint")}
          </p>
        </div>
        <AnalysisPatterns
          chords={chords}
          patterns={patterns}
          onSelect={onSelect}
          className="text-xs"
        />
      </section>

      <section className="space-y-2 px-4 py-4">
        <h2 className="text-sm font-semibold">{t("summary")}</h2>
        <Textarea
          value={analysis.summary}
          onChange={(event) => onSummary(event.target.value)}
          maxLength={LIMITS.summary}
          rows={4}
          readOnly={!canEdit}
          placeholder={t("summaryPlaceholder")}
          className="min-h-24 resize-y text-sm"
        />
      </section>

      <section className="space-y-2 px-4 py-4">
        <h2 className="text-sm font-semibold">{t("notes")}</h2>
        <AnalysisFootnotes
          analysis={analysis}
          chords={chords}
          onSelect={onSelect}
        />
        {!analysis.notes.length &&
          !Object.values(analysis.entries).some((e) => e.note.trim()) && (
            <p className="text-muted-foreground text-xs">{t("noNotes")}</p>
          )}
      </section>

      <section className="space-y-3 px-4 py-4">
        <h2 className="text-sm font-semibold">{t("legend")}</h2>
        <AnalysisLegend analysis={analysis} className="text-xs" />
      </section>
    </div>
  );
}
