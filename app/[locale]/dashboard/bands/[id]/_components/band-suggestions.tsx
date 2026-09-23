"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Loader2,
  MessageSquarePlus,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  Vote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { ClientDate } from "@/components/client-date";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import type { Suggestion, SuggestionFilter } from "@/types/content";
import {
  createSuggestion,
  listSuggestions,
  resolveSuggestion,
  voteSuggestion,
} from "../actions";

export interface SuggestableSong {
  id: string;
  title: string;
  artist_name: string;
}

interface BandSuggestionsProps {
  bandId: string;
  currentUserId: string;
  initial: Suggestion[];
  /** May accept or reject (`manage_setlists`). */
  canManage: boolean;
  /** `song_suggestions` is in the plan. */
  canSuggest: boolean;
  /** Threshold for automatic acceptance, when set. */
  autoAcceptVotes: number | null;
  setlists: Array<{ id: string; title: string; is_repertoire: boolean }>;
  mySongs: SuggestableSong[];
  bandSongs: SuggestableSong[];
}

const FILTERS: SuggestionFilter[] = [
  "open",
  "accepted",
  "rejected",
  "withdrawn",
  "all",
];

const STATUS_STYLES: Record<Suggestion["status"], string> = {
  open: "border-primary/40 bg-primary/10 text-primary",
  accepted:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  withdrawn: "border-border bg-muted text-muted-foreground",
};

/**
 * "Sugestões em votação": members propose songs for a band setlist, vote
 * them up or down, and whoever manages setlists accepts or rejects.
 */
export function BandSuggestions({
  bandId,
  currentUserId,
  initial,
  canManage,
  canSuggest,
  autoAcceptVotes,
  setlists,
  mySongs,
  bandSongs,
}: BandSuggestionsProps) {
  const t = useTranslations("suggestions");
  const tRepertoire = useTranslations("setlists.repertoire");
  const [filter, setFilter] = useState<SuggestionFilter>("open");
  const [items, setItems] = useState(initial);
  const [loading, startLoading] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<{
    suggestion: Suggestion;
    action: "accept" | "reject";
  } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Server refreshes (after any action) bring new open suggestions.
  const [basedOn, setBasedOn] = useState(initial);
  if (basedOn !== initial) {
    setBasedOn(initial);
    if (filter === "open") setItems(initial);
  }

  const changeFilter = (next: SuggestionFilter) => {
    setFilter(next);
    startLoading(async () => {
      const result = await listSuggestions(bandId, next);
      if (result.success && result.data) setItems(result.data.data);
      else if (!result.success) toastActionError(result, result.error);
    });
  };

  const replace = (updated: Suggestion) =>
    setItems((prev) =>
      filter !== "all" && updated.status !== filter
        ? prev.filter((s) => s.id !== updated.id)
        : prev.map((s) => (s.id === updated.id ? updated : s)),
    );

  const vote = async (suggestion: Suggestion, value: -1 | 1) => {
    setBusyId(suggestion.id);
    const next = suggestion.my_vote === value ? 0 : value;
    const result = await voteSuggestion(bandId, suggestion.id, next);
    setBusyId(null);
    if (!result.success || !result.data) {
      if (!result.success)
        toastActionError(result, result.error || t("voteFailed"));
      return;
    }
    if (result.data.status === "accepted") {
      toast.success(t("autoAccepted", { title: result.data.song_title }));
    }
    replace(result.data);
  };

  const withdraw = async (suggestion: Suggestion) => {
    setBusyId(suggestion.id);
    const result = await resolveSuggestion(bandId, suggestion.id, "withdraw");
    setBusyId(null);
    if (result.success && result.data) {
      toast.success(t("withdrawn"));
      replace(result.data);
    } else if (!result.success) {
      toastActionError(result, result.error);
    }
  };

  const setlistName = (setlist: { title: string; is_repertoire: boolean }) =>
    setlist.is_repertoire ? tRepertoire("name") : setlist.title;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" aria-hidden />
            {t("title")}
          </CardTitle>
          <CardDescription>
            {autoAcceptVotes
              ? t("descriptionAuto", { votes: autoAcceptVotes })
              : t("description")}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="suggestion-filter" className="sr-only">
            {t("filterLabel")}
          </label>
          <NativeSelect
            id="suggestion-filter"
            value={filter}
            onChange={(e) => changeFilter(e.target.value as SuggestionFilter)}
            wrapperClassName="w-40"
          >
            {FILTERS.map((status) => (
              <option key={status} value={status}>
                {t(`filters.${status}`)}
              </option>
            ))}
          </NativeSelect>
          <Button
            onClick={() => setIsSuggesting(true)}
            disabled={!canSuggest}
            className="gap-2"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            {t("suggest")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canSuggest && <UpgradeHint message={t("locked")} />}
        {loading ? (
          <p className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("loading")}
          </p>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            {filter === "open" ? t("emptyOpen") : t("empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((s) => {
              const isAuthor = s.suggested_by?.id === currentUserId;
              const busy = busyId === s.id;
              return (
                <li key={s.id} className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{s.song_title}</p>
                        <span className="text-muted-foreground text-sm">
                          {s.artist_name}
                        </span>
                        {s.status !== "open" && (
                          <Badge
                            variant="outline"
                            className={STATUS_STYLES[s.status]}
                          >
                            {t(`status.${s.status}`)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {t("forSetlist", { setlist: setlistName(s.setlist) })}
                        {s.song?.tonality && ` · ${s.song.tonality}`}
                        {s.song?.tempo && ` · ${s.song.tempo} BPM`}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        {s.suggested_by ? (
                          <>
                            <UserAvatar
                              userId={s.suggested_by.id}
                              name={s.suggested_by.username}
                              avatarUrl={s.suggested_by.avatar_url}
                              size="xs"
                            />
                            <span>
                              {t("by", { user: s.suggested_by.username })}
                            </span>
                          </>
                        ) : (
                          <span>{t("byUnknown")}</span>
                        )}
                        <span className="text-muted-foreground">
                          · <ClientDate value={s.created_at} />
                        </span>
                      </div>
                      {s.note && (
                        <p className="bg-muted/50 rounded-md px-3 py-2 text-sm whitespace-pre-wrap">
                          {s.note}
                        </p>
                      )}
                      {s.status !== "open" && (
                        <p className="text-muted-foreground text-xs">
                          {s.resolved_by_username
                            ? t("resolvedBy", { user: s.resolved_by_username })
                            : s.status === "accepted"
                              ? t("resolvedByVotes")
                              : null}
                          {s.resolution_note && ` “${s.resolution_note}”`}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <div
                        className="flex items-center overflow-hidden rounded-md border"
                        role="group"
                        aria-label={t("votesFor", { title: s.song_title })}
                      >
                        <button
                          type="button"
                          onClick={() => void vote(s, 1)}
                          disabled={busy || s.status !== "open"}
                          aria-pressed={s.my_vote === 1}
                          aria-label={t("voteUp", { count: s.votes.up })}
                          className={cn(
                            "focus-visible:ring-ring/50 flex h-8 items-center gap-1.5 px-2.5 text-sm tabular-nums transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:opacity-60",
                            s.my_vote === 1
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "hover:bg-muted",
                          )}
                        >
                          <ThumbsUp
                            className={cn(
                              "h-4 w-4",
                              s.my_vote === 1 && "fill-current",
                            )}
                            aria-hidden
                          />
                          {s.votes.up}
                        </button>
                        <span className="bg-border h-8 w-px" aria-hidden />
                        <button
                          type="button"
                          onClick={() => void vote(s, -1)}
                          disabled={busy || s.status !== "open"}
                          aria-pressed={s.my_vote === -1}
                          aria-label={t("voteDown", { count: s.votes.down })}
                          className={cn(
                            "focus-visible:ring-ring/50 flex h-8 items-center gap-1.5 px-2.5 text-sm tabular-nums transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:opacity-60",
                            s.my_vote === -1
                              ? "bg-destructive/15 text-destructive"
                              : "hover:bg-muted",
                          )}
                        >
                          <ThumbsDown
                            className={cn(
                              "h-4 w-4",
                              s.my_vote === -1 && "fill-current",
                            )}
                            aria-hidden
                          />
                          {s.votes.down}
                        </button>
                      </div>
                      {s.status === "open" && canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() =>
                              setResolving({ suggestion: s, action: "accept" })
                            }
                            disabled={busy}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            {t("accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive gap-1.5"
                            onClick={() =>
                              setResolving({ suggestion: s, action: "reject" })
                            }
                            disabled={busy}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                            {t("reject")}
                          </Button>
                        </>
                      )}
                      {s.status === "open" && isAuthor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          onClick={() => void withdraw(s)}
                          disabled={busy}
                        >
                          <Undo2 className="h-3.5 w-3.5" aria-hidden />
                          {t("withdraw")}
                        </Button>
                      )}
                      {busy && (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <ResolveDialog
        bandId={bandId}
        state={resolving}
        onClose={() => setResolving(null)}
        onDone={(updated) => {
          replace(updated);
          setResolving(null);
        }}
      />

      <SuggestDialog
        bandId={bandId}
        isOpen={isSuggesting}
        onClose={() => setIsSuggesting(false)}
        setlists={setlists}
        mySongs={mySongs}
        bandSongs={bandSongs}
        onCreated={(created) => {
          if (filter === "open" || filter === "all") {
            setItems((prev) => [created, ...prev]);
          }
        }}
      />
    </Card>
  );
}

function ResolveDialog({
  bandId,
  state,
  onClose,
  onDone,
}: {
  bandId: string;
  state: { suggestion: Suggestion; action: "accept" | "reject" } | null;
  onClose: () => void;
  onDone: (updated: Suggestion) => void;
}) {
  const t = useTranslations("suggestions");
  const tCommon = useTranslations("common");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    if (!state) return;
    startTransition(async () => {
      const result = await resolveSuggestion(
        bandId,
        state.suggestion.id,
        state.action,
        note,
      );
      if (result.success && result.data) {
        toast.success(
          state.action === "accept" ? t("accepted") : t("rejected"),
        );
        setNote("");
        onDone(result.data);
      } else if (!result.success) {
        toastActionError(result, result.error);
      }
    });
  };

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state?.action === "accept" ? t("acceptTitle") : t("rejectTitle")}
          </DialogTitle>
          <DialogDescription>
            {state?.action === "accept"
              ? t("acceptDescription", {
                  title: state?.suggestion.song_title ?? "",
                })
              : t("rejectDescription", {
                  title: state?.suggestion.song_title ?? "",
                })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resolve-note">{t("resolutionNote")}</Label>
          <Textarea
            id="resolve-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={state?.action === "reject" ? "destructive" : "default"}
            onClick={confirm}
            disabled={isPending}
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {state?.action === "accept" ? t("accept") : t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuggestDialog({
  bandId,
  isOpen,
  onClose,
  setlists,
  mySongs,
  bandSongs,
  onCreated,
}: {
  bandId: string;
  isOpen: boolean;
  onClose: () => void;
  setlists: Array<{ id: string; title: string; is_repertoire: boolean }>;
  mySongs: SuggestableSong[];
  bandSongs: SuggestableSong[];
  onCreated: (created: Suggestion) => void;
}) {
  const t = useTranslations("suggestions");
  const tRepertoire = useTranslations("setlists.repertoire");
  const tCommon = useTranslations("common");
  const repertoire = setlists.find((s) => s.is_repertoire);
  const [songId, setSongId] = useState("");
  const [setlistId, setSetlistId] = useState(repertoire?.id ?? "");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setSongId("");
    setNote("");
    setSetlistId(repertoire?.id ?? "");
  };

  const submit = () => {
    if (!songId) return;
    startTransition(async () => {
      const result = await createSuggestion(bandId, {
        song_id: songId,
        setlist_id: setlistId || undefined,
        note,
      });
      if (result.success && result.data) {
        toast.success(t("created"));
        onCreated(result.data);
        reset();
        onClose();
      } else if (!result.success) {
        toastActionError(result, result.error || t("createFailed"));
      }
    });
  };

  const label = (song: SuggestableSong) =>
    song.artist_name ? `${song.title} · ${song.artist_name}` : song.title;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("suggestTitle")}</DialogTitle>
          <DialogDescription>{t("suggestDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="suggest-song">{t("songLabel")}</Label>
            <NativeSelect
              id="suggest-song"
              value={songId}
              onChange={(e) => setSongId(e.target.value)}
              disabled={isPending}
            >
              <option value="" disabled>
                {t("songPlaceholder")}
              </option>
              {mySongs.length > 0 && (
                <optgroup label={t("mySongs")}>
                  {mySongs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {label(song)}
                    </option>
                  ))}
                </optgroup>
              )}
              {bandSongs.length > 0 && (
                <optgroup label={t("bandSongs")}>
                  {bandSongs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {label(song)}
                    </option>
                  ))}
                </optgroup>
              )}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggest-setlist">{t("setlistLabel")}</Label>
            <NativeSelect
              id="suggest-setlist"
              value={setlistId}
              onChange={(e) => setSetlistId(e.target.value)}
              disabled={isPending}
            >
              {setlists.map((setlist) => (
                <option key={setlist.id} value={setlist.id}>
                  {setlist.is_repertoire ? tRepertoire("name") : setlist.title}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggest-note-band">{t("noteLabel")}</Label>
            <Textarea
              id="suggest-note-band"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={t("notePlaceholder")}
              disabled={isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={isPending || !songId}>
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {t("send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
