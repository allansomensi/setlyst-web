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
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  ClipboardCopy,
  CloudOff,
  Download,
  Eye,
  FileEdit,
  ImageDown,
  Info,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  Redo2,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Trash2,
  Undo2,
  Wand2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AnalysisPatterns,
  usePatternName,
} from "@/components/analysis/analysis-reading";
import {
  AnalysisAssistant,
  type AssistantResult,
} from "@/components/analysis/analysis-assistant";
import {
  AnalysisInsights,
  SectionProgressions,
  useSectionLabel,
} from "@/components/analysis/analysis-insights";
import {
  AnalysisReview,
  type ReviewActions,
} from "@/components/analysis/analysis-review";
import { HarmonicField } from "@/components/analysis/harmonic-field";
import { HarmonicTimeline } from "@/components/analysis/harmonic-timeline";
import {
  BulkInspector,
  type BulkActions,
} from "@/components/analysis/analysis-bulk";
import { AnalysisShortcuts } from "@/components/analysis/analysis-shortcuts";
import { QualityStyleProvider } from "@/components/analysis/analysis-marks";
import { findPatterns } from "@/lib/music/analysis-concepts";
import {
  analysisStats,
  analysisToMarkdown,
  progressionBySection,
  readChords,
  reviewAnalysis,
} from "@/lib/music/analysis-insights";
import {
  applySuggestions,
  detectKey,
  suggestAnalysis,
  type ChordSuggestion,
} from "@/lib/music/analysis-suggest";
import { chordShape, degreeQuality } from "@/lib/music/analysis-theory";
import { shouldPreferFlats, transposeKey } from "@/lib/music/chords";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { copyText } from "@/lib/clipboard";
import { saveBlob } from "@/lib/download";
import { cn } from "@/lib/utils";
import { onRadioGroupKeyDown } from "@/hooks/radio-group-keys";
import { parseChordPro } from "@/lib/music/chordpro";
import {
  LIMITS,
  NUMERALS,
  addConnection,
  addRangeNote,
  analysisIsEmpty,
  buildSheet,
  clearChord,
  compactAnalysis,
  copyDegree,
  degreeIsSet,
  emptyAnalysis,
  emptyEntry,
  footnotes as buildFootnotes,
  formatDegree,
  isMinorKey,
  keyAt,
  newId,
  normalizeAnalysis,
  reconcile,
  removeConnection,
  removeRangeNote,
  sameChordTargets,
  setEntry,
  setKeyMark,
  sheetSections,
  transposeLines,
  updateConnection,
  updateRangeNote,
  type AnalysisDisplay,
  type ChordBadge,
  type ConnectionKind,
  type Degree,
  type HarmonicAnalysis,
  type HarmonicFunction,
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

/**
 * A preference of this device (the timeline, the assistant's faint
 * degrees): remembered across visits, never part of the analysis.
 */
function useDevicePreference(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? fallback : stored === "1";
    } catch {
      return fallback;
    }
  });
  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Private mode: the choice just isn't remembered.
      }
    },
    [key],
  );
  return [value, update] as const;
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

type SideTab = "overview" | "reading" | "insights" | "review" | "field";

/** Indexes from `from` to `to`, inclusive. */
const span = ([from, to]: [number, number]) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

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
  const sections = useMemo(() => sheetSections(lines), [lines]);
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
  // Where a run of chords selected with Shift started.
  const [anchor, setAnchor] = useState<number | null>(null);
  const [pending, setPending] = useState<
    (PendingPick & { connection?: ConnectionKind }) | null
  >(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [editing, setEditing] = useState(canEdit);
  const [sideTab, setSideTab] = useState<SideTab>("overview");
  const [viewTab, setViewTab] = useState("reading");
  // Reading the analysis in another key (view mode only).
  const [transpose, setTranspose] = useState(0);
  const [showTimeline, setShowTimeline] = useDevicePreference(
    "setlyst:analysis-timeline",
    true,
  );
  const [showGhosts, setShowGhosts] = useDevicePreference(
    "setlyst:analysis-ghosts",
    true,
  );

  const range = useMemo<[number, number] | null>(
    () =>
      anchor !== null && selected !== null && anchor !== selected
        ? [Math.min(anchor, selected), Math.max(anchor, selected)]
        : null,
    [anchor, selected],
  );

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
      let result: Awaited<ReturnType<typeof saveSongAnalysis>>;
      try {
        result = await saveSongAnalysis(
          song.id,
          content,
          force ? null : baseRef.current,
        );
      } catch {
        // The request itself failed (connection dropped mid-save): retried
        // like any failed save, instead of staying "saving" for good.
        inFlight.current = false;
        setStatus("error");
        return;
      }
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

  // Reading the chart: the key, the assistant, the statistics, the review

  const detected = useMemo(() => detectKey(chords, 3), [chords]);
  // With no key on the song, the analysis is read in the detected one.
  const readingKey = songKey ?? detected[0]?.key ?? null;
  // Suggestions depend on the chords and the key marks only: typing a
  // note doesn't recompute them.
  const keyMarks = analysis.keys;
  const suggestions = useMemo(
    () =>
      suggestAnalysis(
        chords,
        { ...emptyAnalysis(), keys: keyMarks },
        readingKey,
      ),
    [chords, keyMarks, readingKey],
  );
  const suggestionAt = useMemo(
    () => new Map(suggestions.chords.map((s) => [s.index, s])),
    [suggestions],
  );
  const readings = useMemo(
    () => readChords(analysis, chords, readingKey, suggestions.chords),
    [analysis, chords, readingKey, suggestions],
  );
  const stats = useMemo(
    () => analysisStats(analysis, chords, readingKey, suggestions.chords),
    [analysis, chords, readingKey, suggestions],
  );
  const issues = useMemo(
    () => reviewAnalysis(analysis, chords, songKey, suggestions.chords),
    [analysis, chords, songKey, suggestions],
  );
  const sectionRows = useMemo(
    () => progressionBySection(sections, readings),
    [sections, readings],
  );
  const ghosts = useMemo(() => {
    if (!editing || !showGhosts) return null;
    const map = new Map<number, Degree>();
    for (const s of suggestions.chords) {
      if (!degreeIsSet(analysis.entries[String(s.index)]?.degree)) {
        map.set(s.index, s.degree);
      }
    }
    return map;
  }, [editing, showGhosts, suggestions, analysis.entries]);

  // Selection and picking

  const select = useCallback(
    (index: number | null, extend = false) => {
      setHighlight(null);
      if (index === null) {
        setSelected(null);
        setAnchor(null);
        return;
      }
      const clamped = Math.max(0, Math.min(chords.length - 1, index));
      if (extend) {
        setAnchor((previous) => previous ?? selected ?? clamped);
      } else {
        setAnchor(null);
      }
      setSelected(clamped);
    },
    [chords.length, selected],
  );

  const onChordClick = useCallback(
    (index: number, extend = false) => {
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
      if (extend && selected !== null) {
        select(index, true);
        return;
      }
      setAnchor(null);
      setSelected((current) => (current === index ? null : index));
    },
    [pending, apply, selected, select],
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

  /** Writes the assistant's reading on chords, keeping what's written. */
  const acceptSuggestions = useCallback(
    (indexes: number[]) => {
      const accepted = indexes
        .map((i) => suggestionAt.get(i))
        .filter((s): s is ChordSuggestion => !!s);
      if (!accepted.length) return 0;
      apply((a) => {
        let next = a;
        for (const s of accepted) {
          const entry = next.entries[String(s.index)] ?? emptyEntry();
          next = setEntry(next, s.index, {
            degree: { ...s.degree },
            fn: entry.fn ?? s.fn,
            badges: [
              ...entry.badges,
              ...s.badges.filter((b) => !entry.badges.includes(b)),
            ],
          });
        }
        return next;
      });
      return accepted.length;
    },
    [apply, suggestionAt],
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
      acceptSuggestion: () => void acceptSuggestions([i]),
      select: (index) => select(index),
      highlight: setHighlight,
      close: () => select(null),
    };
  }, [selected, apply, sameTargets, select, t, acceptSuggestions]);

  // Writing on every selected chord at once (one, or a run of them).
  const targets = useCallback(
    () => (range ? span(range) : selected !== null ? [selected] : []),
    [range, selected],
  );

  const setFunctionOn = useCallback(
    (indexes: number[], fn: HarmonicFunction | null) =>
      apply((a) => indexes.reduce((next, i) => setEntry(next, i, { fn }), a)),
    [apply],
  );

  const toggleFunction = useCallback(
    (fn: HarmonicFunction) => {
      const indexes = targets();
      if (!indexes.length) return;
      const all = indexes.every((i) => analysis.entries[String(i)]?.fn === fn);
      setFunctionOn(indexes, all ? null : fn);
    },
    [analysis.entries, setFunctionOn, targets],
  );

  const setBadgeOn = useCallback(
    (indexes: number[], badge: ChordBadge, on: boolean) =>
      apply((a) =>
        indexes.reduce((next, i) => {
          const badges = next.entries[String(i)]?.badges ?? [];
          const has = badges.includes(badge);
          if (has === on) return next;
          return setEntry(next, i, {
            badges: on ? [...badges, badge] : badges.filter((b) => b !== badge),
          });
        }, a),
      ),
    [apply],
  );

  /** "1"–"7": the diatonic degree, with the chord's own quality. */
  const writeDiatonic = useCallback(
    (index: number, step: number) => {
      const key = keyAt(analysis, index, readingKey);
      const minor = isMinorKey(key);
      const shape = chordShape(chords[index] ?? "");
      const numeral = NUMERALS[step];
      const flat = minor && (step === 2 || step === 5 || step === 6);
      const degree: Degree = {
        sub: false,
        accidental: flat ? "b" : "",
        numeral,
        quality: shape ? degreeQuality(shape) : "",
        target: "",
      };
      apply((a) => setEntry(a, index, { degree }));
    },
    [analysis, apply, chords, readingKey],
  );

  const bulkActions: BulkActions | null = useMemo(() => {
    if (!range) return null;
    const indexes = span(range);
    return {
      setFunction: (fn) => setFunctionOn(indexes, fn),
      setBadge: (badge, on) => setBadgeOn(indexes, badge, on),
      fillSuggestions: () => {
        const result = applySuggestions(analysis, suggestions, {
          overwrite: false,
          degrees: true,
          functions: true,
          marks: true,
          connections: true,
          range,
        });
        apply(() => result.analysis);
        toast.success(t("assistant.applied", { ...result.counts, keys: 0 }));
      },
      openAssistant: () => setAssistantOpen(true),
      annotate: () => {
        const id = newId();
        apply((a) => addRangeNote(a, range[0], range[1], "amber", id).analysis);
        setAnchor(null);
        setSelected(range[0]);
        setFocusNote(id);
      },
      clear: () =>
        apply((a) => indexes.reduce((next, i) => clearChord(next, i), a)),
      copyDegrees: async () => {
        const text = indexes
          .map((i) => {
            const degree = analysis.entries[String(i)]?.degree;
            return degreeIsSet(degree) ? formatDegree(degree) : chords[i];
          })
          .join("  ");
        if (await copyText(text)) toast.success(t("bulk.copied"));
        else toast.error(t("bulk.copyFailed"));
      },
      select: (index) => select(index),
      close: () => select(null),
    };
  }, [
    range,
    analysis,
    suggestions,
    apply,
    chords,
    select,
    setBadgeOn,
    setFunctionOn,
    t,
  ]);

  const reviewActions: ReviewActions = useMemo(
    () => ({
      select: (index) => select(index),
      setDegree: (index, degree) =>
        apply((a) => setEntry(a, index, { degree })),
      setFunction: (index, fn) => apply((a) => setEntry(a, index, { fn })),
      removeConnection: (id) => apply((a) => removeConnection(a, id)),
      removeNote: (id) => apply((a) => removeRangeNote(a, id)),
      openAssistant: () => setAssistantOpen(true),
    }),
    [apply, select],
  );

  const onAssistant = useCallback(
    ({ analysis: next, counts }: AssistantResult) => {
      apply(() => next);
      toast.success(t("assistant.applied", { ...counts }));
    },
    [apply, t],
  );

  // Keyboard: arrows move between chords (with Shift, select a run), Esc
  // backs out, Delete clears, letters and digits write; Ctrl/Cmd+Z undoes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "s" && editing) {
        event.preventDefault();
        void save();
        return;
      }
      if (!editing) {
        if (event.key === "?" && !isTyping(event.target)) {
          setShortcutsOpen(true);
        }
        return;
      }
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
      if (event.key === "?") {
        setShortcutsOpen(true);
        return;
      }
      if (event.key === "A" && event.shiftKey) {
        event.preventDefault();
        setAssistantOpen(true);
        return;
      }
      if (event.key === "Escape") {
        if (pending) setPending(null);
        else if (range) setAnchor(null);
        else select(null);
        return;
      }
      if (selected === null) return;
      const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
      const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
      if (forward || back) {
        event.preventDefault();
        select(selected + (forward ? 1 : -1), event.shiftKey);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const indexes = targets();
        apply((a) => indexes.reduce((next, i) => clearChord(next, i), a));
        return;
      }
      if (event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "t" || key === "s" || key === "d") {
        event.preventDefault();
        toggleFunction(key === "t" ? "T" : key === "s" ? "SD" : "D");
        return;
      }
      if (key === "a") {
        event.preventDefault();
        const indexes = targets();
        const all = indexes.every((i) =>
          analysis.entries[String(i)]?.badges.includes("aem"),
        );
        setBadgeOn(indexes, "aem", !all);
        return;
      }
      if (key === "g") {
        event.preventDefault();
        const count = acceptSuggestions(targets());
        if (count > 1) toast.success(t("inspector.accepted", { count }));
        return;
      }
      if (/^[1-7]$/.test(event.key) && !range) {
        event.preventDefault();
        writeDiatonic(selected, Number(event.key) - 1);
        return;
      }
      if (event.key === "Enter" && !range) {
        const target = event.target as HTMLElement | null;
        // From a chord (or nowhere in particular): into the degree field.
        if (
          target === document.body ||
          target?.hasAttribute("data-chord-index")
        ) {
          const input = document.querySelector<HTMLInputElement>(
            "[data-degree-input]",
          );
          if (input) {
            event.preventDefault();
            input.focus();
            input.select();
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editing,
    pending,
    selected,
    range,
    select,
    apply,
    save,
    targets,
    toggleFunction,
    setBadgeOn,
    acceptSuggestions,
    writeDiatonic,
    analysis.entries,
    t,
  ]);

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

  // Reading in another key: chords and key marks move, degrees stay.
  const shownKey = songKey ? transposeKey(songKey, transpose) : null;
  const signed = transpose > 6 ? transpose - 12 : transpose;
  const shift = signed > 0 ? `+${signed}` : `−${-signed}`;
  const shownLines = useMemo(
    () =>
      transposeLines(
        lines,
        transpose,
        shouldPreferFlats(readingKey, transpose, chords[0]),
      ),
    [lines, transpose, readingKey, chords],
  );
  const shownChords = useMemo(
    () =>
      transpose
        ? shownLines.flatMap((line) =>
            line.kind === "chords"
              ? line.words
                  .flat()
                  .flatMap((cell) =>
                    cell.kind === "chord" ? [cell.symbol] : [],
                  )
              : [],
          )
        : chords,
    [transpose, shownLines, chords],
  );
  const shownAnalysis = useMemo(
    () =>
      transpose
        ? {
            ...analysis,
            keys: analysis.keys.map((k) => ({
              ...k,
              key: transposeKey(k.key, transpose) ?? k.key,
            })),
          }
        : analysis,
    [analysis, transpose],
  );

  const shownRegions = useMemo(
    () =>
      transpose && !editing
        ? stats.regions.map((r) => ({
            ...r,
            key: transposeKey(r.key, transpose) ?? r.key,
          }))
        : stats.regions,
    [transpose, editing, stats.regions],
  );

  // The progression by section with the chords as shown (transposed).
  const shownSectionRows = useMemo(
    () =>
      transpose
        ? sectionRows.map((row) => ({
            ...row,
            chords: row.chords.map((c) => ({
              ...c,
              symbol: shownChords[c.index] ?? c.symbol,
            })),
          }))
        : sectionRows,
    [transpose, sectionRows, shownChords],
  );

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
    tonality: editing ? songKey : shownKey,
    tempo: song.tempo ?? null,
    timeSignature: song.time_signature ?? null,
  };

  // Text export: the progression by section, the cadences and the notes.
  const patternName = usePatternName();
  const sectionLabel = useSectionLabel();
  const markdown = () => {
    const notes = buildFootnotes(analysis);
    const written = sectionRows.map((row) => ({
      ...row,
      chords: row.chords.map((c) =>
        c.inferred ? { ...c, degree: null, fn: c.fnInferred ? null : c.fn } : c,
      ),
    }));
    return analysisToMarkdown(
      {
        title: song.title,
        artist: song.artist_name ?? null,
        songKey,
        sections: written,
        patternCount: patterns.length,
        footnoteCount: notes.length,
        summary: analysis.summary,
      },
      {
        title: t("title"),
        key: (key) => t("export.key", { key }),
        section: sectionLabel,
        summary: t("export.summary"),
        notes: t("export.notes"),
        patterns: t("reading.patternsTitle"),
        pattern: (i) => {
          const p = patterns[i];
          return `${patternName(p).name}: ${p.chords.map((c) => chords[c]).join(" → ")}`;
        },
        footnote: (i) => {
          const note = notes[i];
          return `${chords[note.at] ?? ""} — ${note.text}`;
        },
      },
    );
  };
  const copyMarkdown = async () => {
    if (await copyText(markdown())) toast.success(t("textExport.copied"));
    else toast.error(t("textExport.failed"));
  };
  const downloadMarkdown = () => {
    const name =
      song.title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "analysis";
    saveBlob(
      new Blob([markdown()], { type: "text/markdown;charset=utf-8" }),
      `${name}.md`,
    );
    toast.success(t("textExport.downloaded"));
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
    editing && range && bulkActions ? (
      <BulkInspector
        key={`${range[0]}-${range[1]}`}
        analysis={analysis}
        chords={chords}
        range={range}
        suggestions={suggestionAt}
        actions={bulkActions}
      />
    ) : editing && selected !== null && actions ? (
      <AnalysisInspector
        key={selected}
        analysis={analysis}
        chords={chords}
        index={selected}
        songKey={readingKey}
        sameCount={sameTargets.length}
        patterns={patterns}
        actions={actions}
        suggestion={suggestionAt.get(selected) ?? null}
        issues={issues.filter((issue) => issue.at === selected)}
        focusNote={focusNote}
      />
    ) : null;

  const warnings = issues.filter((i) => i.severity === "warning").length;
  const noKeyMarkAtStart = !analysis.keys.some((k) => k.at === 0);

  const sidePanel = (
    <Tabs
      value={sideTab}
      onValueChange={(value) => setSideTab(value as SideTab)}
      className="gap-0"
    >
      <div className="bg-popover/95 supports-[backdrop-filter]:bg-popover/80 sticky top-0 z-10 border-b px-3 py-2.5 backdrop-blur">
        <TabsList className="grid h-9 w-full grid-cols-5">
          {(
            [
              ["overview", LayoutDashboard],
              ["reading", BookOpen],
              ["insights", BarChart3],
              ["review", ListChecks],
              ["field", Table2],
            ] as const
          ).map(([id, Icon]) => (
            <TabsTrigger
              key={id}
              value={id}
              className="relative px-1"
              title={t(`side.${id}`)}
            >
              <Icon aria-hidden />
              <span className="sr-only">{t(`side.${id}`)}</span>
              {id === "review" && issues.length > 0 && (
                <span
                  className={cn(
                    "absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[0.55rem] font-bold",
                    warnings
                      ? "bg-destructive text-white"
                      : "bg-primary text-primary-foreground",
                  )}
                  aria-hidden
                >
                  {issues.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <p className="mt-1.5 text-center text-xs font-semibold">
          {t(`side.${sideTab}`)}
        </p>
      </div>

      <TabsContent value="overview" className="divide-y">
        {!songKey && noKeyMarkAtStart && detected[0] && (
          <section className="space-y-2 px-4 py-4">
            <div className="flex items-start gap-2">
              <Info
                className="text-primary mt-0.5 h-4 w-4 shrink-0"
                aria-hidden
              />
              <p className="text-sm">
                {t("detectedKey.text", {
                  key: detected[0].key,
                  confidence: Math.round(detected[0].confidence * 100),
                })}
              </p>
            </div>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => apply((a) => setKeyMark(a, 0, detected[0].key))}
              >
                {t("detectedKey.use", { key: detected[0].key })}
              </Button>
            )}
          </section>
        )}
        <Overview
          analysis={analysis}
          chords={chords}
          analysed={analysed}
          canEdit={canEdit}
          pending={
            suggestions.chords.filter(
              (c) => !degreeIsSet(analysis.entries[String(c.index)]?.degree),
            ).length
          }
          onAssistant={() => setAssistantOpen(true)}
          onSummary={(summary) => apply((a) => ({ ...a, summary }), "summary")}
          onSelect={select}
        />
      </TabsContent>

      <TabsContent value="reading" className="space-y-6 px-4 py-4">
        <section className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold">
              {t("reading.patternsTitle")}
            </h2>
            <p className="text-muted-foreground text-xs">
              {t("reading.patternsHint")}
            </p>
          </div>
          <AnalysisPatterns
            chords={chords}
            patterns={patterns}
            onSelect={select}
            className="text-xs"
          />
        </section>
        <section className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold">{t("sections.title")}</h2>
            <p className="text-muted-foreground text-xs">
              {t("sections.hint")}
            </p>
          </div>
          <SectionProgressions sections={sectionRows} onSelect={select} />
        </section>
      </TabsContent>

      <TabsContent value="insights" className="px-4 py-4">
        <AnalysisInsights stats={stats} onSelect={select} />
      </TabsContent>

      <TabsContent value="review" className="px-4 py-4">
        <AnalysisReview
          issues={issues}
          chords={chords}
          actions={reviewActions}
          canEdit={canEdit}
        />
      </TabsContent>

      <TabsContent value="field" className="space-y-2 px-4 py-4">
        <p className="text-muted-foreground text-xs">
          {t("field.overviewHint")}
        </p>
        <HarmonicField defaultKey={readingKey} songChords={chords} />
      </TabsContent>
    </Tabs>
  );

  return (
    <QualityStyleProvider value={analysis.display.qualityStyle}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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
                        setTranspose(0);
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
                {editing && (
                  <Button
                    variant="outline"
                    className="border-primary/40 text-primary hover:text-primary h-9 gap-2"
                    onClick={() => setAssistantOpen(true)}
                    title={t("assistant.shortcut")}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden />
                    <span className="sr-only sm:not-sr-only">
                      {t("assistant.button")}
                    </span>
                  </Button>
                )}
              </>
            )}

            {!editing && (
              <div
                className="bg-muted inline-flex h-9 items-center rounded-lg p-0.5"
                role="group"
                aria-label={t("transpose.label")}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTranspose((n) => (n - 1 + 12) % 12 || 0)}
                  aria-label={t("transpose.down")}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <button
                  type="button"
                  onClick={() => setTranspose(0)}
                  disabled={!transpose}
                  className="min-w-20 px-1 text-center text-xs font-semibold tabular-nums"
                  title={transpose ? t("transpose.reset") : undefined}
                >
                  {shownKey
                    ? t("transpose.key", { key: shownKey })
                    : transpose
                      ? t("transpose.semitones", { shift })
                      : t("transpose.original")}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTranspose((n) => (n + 1) % 12)}
                  aria-label={t("transpose.up")}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
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
              <DropdownMenuContent
                align="end"
                className="max-h-[75dvh] w-72 overflow-y-auto"
              >
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
                  onCheckedChange={(value) =>
                    setDisplay({ showLyrics: !!value })
                  }
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
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                  {t("display.notation")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={analysis.display.qualityStyle}
                  onValueChange={(value) =>
                    setDisplay({
                      qualityStyle: value as AnalysisDisplay["qualityStyle"],
                    })
                  }
                >
                  <DropdownMenuRadioItem value="br" onSelect={keepOpen}>
                    {t("display.notationBr")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="intl" onSelect={keepOpen}>
                    {t("display.notationIntl")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                  {t("display.device")}
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={showTimeline}
                  onCheckedChange={(value) => setShowTimeline(!!value)}
                  onSelect={keepOpen}
                >
                  {t("display.timeline")}
                </DropdownMenuCheckboxItem>
                {canEdit && (
                  <DropdownMenuCheckboxItem
                    checked={showGhosts}
                    onCheckedChange={(value) => setShowGhosts(!!value)}
                    onSelect={keepOpen}
                  >
                    {t("display.ghosts")}
                  </DropdownMenuCheckboxItem>
                )}
                {!canEdit && (
                  <p className="text-muted-foreground px-2 py-1.5 text-xs">
                    {t("display.readOnlyHint")}
                  </p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 gap-2" disabled={empty && !canEdit}>
                  <Download className="h-4 w-4" aria-hidden />
                  <span>{t("exportMenu.title")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => setExportOpen(true)}>
                  <ImageDown className="mr-2 h-4 w-4" aria-hidden />
                  {t("exportMenu.image")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void copyMarkdown()}>
                  <ClipboardCopy className="mr-2 h-4 w-4" aria-hidden />
                  {t("exportMenu.copyText")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadMarkdown}>
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  {t("exportMenu.markdown")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
                <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
                  <Keyboard className="mr-2 h-4 w-4" aria-hidden />
                  {t("shortcutsDialog.title")}
                </DropdownMenuItem>
                {canEdit && initial && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                      {t("delete.action")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="bg-muted/60 flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm"
          >
            <Info
              className="text-primary mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
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

        {editing && !empty && selected === null && !pending && (
          // Below lg there's no side panel saying what to do next.
          <p className="text-muted-foreground -mt-2 text-xs lg:hidden">
            {t("overview.hint")}
          </p>
        )}

        <div
          className={cn(
            "grid gap-6",
            editing && "lg:grid-cols-[minmax(0,1fr)_24rem]",
          )}
        >
          <Card className="min-w-0 gap-0 overflow-hidden py-0 [--an-halo:var(--card)]">
            {showTimeline && (
              <div className="border-b px-4 pt-3 pb-2 sm:px-8">
                <p className="text-muted-foreground mb-1.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase">
                  {t("timeline.title")}
                </p>
                <HarmonicTimeline
                  readings={readings}
                  sections={sections}
                  regions={shownRegions}
                  selected={editing ? selected : null}
                  range={editing ? range : null}
                  onSelect={
                    editing
                      ? (index, extend) => select(index, extend)
                      : undefined
                  }
                />
              </div>
            )}
            <CardContent className="px-4 pt-2 pb-8 sm:px-8">
              {editing && empty && selected === null && (
                <div className="bg-primary/5 border-primary/20 mt-4 mb-2 flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="font-semibold">{t("start.title")}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {t("start.description")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => setAssistantOpen(true)}
                  >
                    <Wand2 className="h-4 w-4" aria-hidden />
                    {t("start.assistant")}
                  </Button>
                </div>
              )}
              {transpose !== 0 && !editing && (
                <p className="bg-muted/60 mt-4 rounded-md px-3 py-2 text-xs">
                  {shownKey
                    ? t("transpose.noticeKey", { key: shownKey, shift })
                    : t("transpose.notice", { shift })}
                </p>
              )}
              <ChordDiagramHost>
                <AnalysisSheet
                  lines={editing ? lines : shownLines}
                  analysis={editing ? analysis : shownAnalysis}
                  songKey={editing ? songKey : shownKey}
                  mode={editing ? "edit" : "view"}
                  selected={editing ? selected : null}
                  pending={pending}
                  range={editing ? range : null}
                  ghosts={ghosts}
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
                {inspector ?? sidePanel}
              </div>
            </aside>
          )}
        </div>

        {/* Phones and tablets: with nothing selected, the overview sits
            under the chart. */}
        {editing && !inspector && (
          <Card className="overflow-hidden py-0 lg:hidden">{sidePanel}</Card>
        )}

        {!editing && (
          <Card>
            <CardContent className="py-5">
              <Tabs value={viewTab} onValueChange={setViewTab}>
                <TabsList className="max-w-full">
                  <TabsTrigger value="reading">
                    <BookOpen aria-hidden />
                    {t("viewTabs.reading")}
                  </TabsTrigger>
                  <TabsTrigger value="sections">
                    <Table2 aria-hidden />
                    {t("viewTabs.sections")}
                  </TabsTrigger>
                  <TabsTrigger value="insights">
                    <BarChart3 aria-hidden />
                    {t("viewTabs.insights")}
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <ListChecks aria-hidden />
                    {t("viewTabs.notes")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reading" className="pt-4">
                  <p className="text-muted-foreground mb-3 text-xs">
                    {t("reading.patternsHint")}
                  </p>
                  <AnalysisPatterns
                    chords={shownChords}
                    patterns={patterns}
                    className="grid gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3"
                  />
                </TabsContent>

                <TabsContent value="sections" className="pt-4">
                  <p className="text-muted-foreground mb-3 text-xs">
                    {t("sections.hint")}
                  </p>
                  <SectionProgressions
                    sections={shownSectionRows}
                    showChords={analysis.display.showChords}
                  />
                </TabsContent>

                <TabsContent value="insights" className="pt-4">
                  <AnalysisInsights stats={stats} layout="grid" />
                </TabsContent>

                <TabsContent
                  value="notes"
                  className="grid gap-8 pt-4 md:grid-cols-2 xl:grid-cols-3"
                >
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
                  <section>
                    <h2 className="mb-3 text-sm font-semibold">
                      {t("overview.notes")}
                    </h2>
                    <AnalysisFootnotes
                      analysis={analysis}
                      chords={shownChords}
                    />
                    {!analysis.notes.length &&
                      !Object.values(analysis.entries).some((e) =>
                        e.note.trim(),
                      ) && (
                        <p className="text-muted-foreground text-sm">
                          {t("overview.noNotes")}
                        </p>
                      )}
                  </section>
                  <section>
                    <h2 className="mb-2 text-sm font-semibold">
                      {t("overview.summary")}
                    </h2>
                    {analysis.summary.trim() ? (
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {analysis.summary}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {t("overview.noSummary")}
                      </p>
                    )}
                  </section>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Phones and tablets: the inspector docks at the bottom of the
            screen, over the chart, which stays scrollable and tappable. The
            negative offsets cancel the scroll area's own padding (bottom and
            sides, as the dashboard layout sets them), so the sheet sits flush
            on the tab bar instead of a strip of chart showing under it. */}
        {editing && (inspector || pending) && (
          <div className="sticky -bottom-6 z-30 -mx-4 md:-bottom-8 md:-mx-8 lg:hidden">
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
            {t("shortcuts")}{" "}
            <button
              type="button"
              className="hover:text-foreground underline underline-offset-2"
              onClick={() => setShortcutsOpen(true)}
            >
              {t("allShortcuts")}
            </button>
          </p>
        )}

        <AnalysisExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          song={exportSong}
          analysis={editing ? analysis : shownAnalysis}
          lines={editing ? lines : shownLines}
          chords={editing ? chords : shownChords}
          author={session?.user?.name ?? initial?.updated_by_username ?? null}
          sections={editing ? sectionRows : shownSectionRows}
          stats={stats}
        />

        {canEdit && (
          <AnalysisAssistant
            open={assistantOpen}
            onOpenChange={setAssistantOpen}
            analysis={analysis}
            chords={chords}
            sections={sections}
            songKey={songKey}
            range={range}
            onApply={onAssistant}
          />
        )}

        <AnalysisShortcuts
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
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
    </QualityStyleProvider>
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
  analysed,
  pending,
  canEdit,
  onAssistant,
  onSummary,
  onSelect,
}: {
  analysis: HarmonicAnalysis;
  chords: readonly string[];
  analysed: number;
  /** Chords the assistant could still fill. */
  pending: number;
  canEdit: boolean;
  onAssistant: () => void;
  onSummary: (summary: string) => void;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("analysis.overview");
  const percent = chords.length
    ? Math.round((analysed / chords.length) * 100)
    : 0;
  return (
    <>
      <section className="space-y-2 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t("progress")}</h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {t("progressCount", { analysed, total: chords.length })}
          </span>
        </div>
        <Progress
          value={percent}
          aria-label={t("progress")}
          className="h-1.5"
        />
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
        {canEdit && pending > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            onClick={onAssistant}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("assistantCta", { count: pending })}
          </Button>
        )}
      </section>

      <section className="space-y-2 px-4 py-4">
        <h2 id="analysis-summary-heading" className="text-sm font-semibold">
          {t("summary")}
        </h2>
        <Textarea
          aria-labelledby="analysis-summary-heading"
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
    </>
  );
}
