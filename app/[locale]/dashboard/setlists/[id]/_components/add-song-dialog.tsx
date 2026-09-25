"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useTranslations } from "next-intl";
import { Library, Loader2, Plus, Send } from "lucide-react";
import { Song, Artist, SetlistSong } from "@/types/api";
import {
  addSongToSetlist,
  addSongsToSetlist,
  searchBandRepertoire,
  suggestSongForSetlist,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { filterBySearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UpgradeHint } from "@/components/content/upgrade-hint";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";

/** Band context of a band setlist. */
export interface AddSongBandContext {
  id: string;
  /** May add directly (`manage_setlists`); otherwise songs are suggested. */
  canManage: boolean;
  /** `song_suggestions` is in the plan. */
  canSuggest: boolean;
  /** This setlist is the band's repertoire (no "from repertoire" tab). */
  isRepertoire: boolean;
}

export interface AddSongDialogProps {
  /** The setlist songs are added to. */
  setlistId: string;
  /** Songs that can be picked (the caller decides the source). */
  songs: Song[];
  /** Used to show each song's artist next to its title. */
  artists: Artist[];
  /**
   * Songs already in the setlist (ids and `forked_from` ids), left out of
   * the list.
   */
  excludedSongIds: string[];
  isOpen: boolean;
  onClose: () => void;
  /** Called for each song added (the dialog stays open for more). */
  onAdded?: (songId: string) => void;
  /** Band setlists: repertoire tab and suggestions. */
  band?: AddSongBandContext;
}

/**
 * Adds songs to the end of a setlist: several at once from the person's
 * own songs (searchable, filterable by tag and key), or one at a time from
 * the band repertoire.
 *
 * Band setlists get two tabs, "Repertório da banda" (the band's own
 * songs) and "Minhas músicas" (a personal song, copied into the band).
 * Members who can't change setlists suggest the song instead: the band
 * votes and a manager decides.
 */
export function AddSongDialog(props: AddSongDialogProps) {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="sm:max-w-lg">
        {/* Remounted per open: always starts with nothing selected. */}
        {props.isOpen && <AddSongContent {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function AddSongContent(props: AddSongDialogProps) {
  const t = useTranslations("setlists.songs.addDialog");
  const { band } = props;
  const suggesting = !!band && !band.canManage;
  const showRepertoire = !!band && !band.isRepertoire;
  const [tab, setTab] = useState<"repertoire" | "mine">(
    showRepertoire ? "repertoire" : "mine",
  );

  const header = (
    <DialogHeader>
      <DialogTitle>{suggesting ? t("suggestTitle") : t("title")}</DialogTitle>
      <DialogDescription>
        {suggesting ? t("suggestDescription") : t("description")}
      </DialogDescription>
    </DialogHeader>
  );

  if (suggesting && !band.canSuggest) {
    return (
      <>
        {header}
        <UpgradeHint message={t("suggestLocked")} className="py-2 text-sm" />
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  if (!showRepertoire) {
    return (
      <>
        {header}
        <MySongsForm {...props} suggesting={suggesting} />
      </>
    );
  }

  return (
    <>
      {header}
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "repertoire" | "mine")}
      >
        <TabsList className="w-full">
          <TabsTrigger value="repertoire" className="flex-1">
            <Library aria-hidden />
            {t("tabs.repertoire")}
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1">
            {t("tabs.mine")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="repertoire" className="pt-2">
          <RepertoirePicker {...props} suggesting={suggesting} />
        </TabsContent>
        <TabsContent value="mine" className="pt-2">
          <MySongsForm {...props} suggesting={suggesting} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/**
 * Adds (or suggests) one song, with the right toast. A suggestion closes
 * the dialog; an addition keeps it open for the next song.
 */
function useAddOrSuggest({
  setlistId,
  band,
  onAdded,
  onClose,
  suggesting,
}: AddSongDialogProps & { suggesting: boolean }) {
  const t = useTranslations("setlists.songs.addDialog");
  const [isPending, startTransition] = useTransition();

  const submit = (songId: string, note?: string) => {
    startTransition(async () => {
      if (suggesting && band) {
        const result = await suggestSongForSetlist(band.id, {
          song_id: songId,
          setlist_id: setlistId,
          note,
        });
        if (result.success) {
          toast.success(t("suggested"));
          onClose();
        } else {
          toastActionError(result, result.error || t("suggestFailed"));
        }
        return;
      }
      const result = await addSongToSetlist(setlistId, { song_id: songId });
      if (result.success) {
        // Stays open: the next song is usually one tap away.
        toast.success(t("added"));
        onAdded?.(songId);
      } else {
        toastActionError(result, result.error || t("addFailed"));
      }
    });
  };

  return { submit, isPending };
}

/** Most rows rendered at once; the search narrows the rest down. */
const MAX_VISIBLE = 200;

/**
 * The person's own songs as a searchable, filterable checklist: pick as
 * many as needed and add them in one go, in the order they were ticked.
 * The dialog stays open afterwards, so a whole set can be built without
 * reopening it. Suggesting (members who can't edit the setlist) picks one.
 */
function MySongsForm(props: AddSongDialogProps & { suggesting: boolean }) {
  const { songs, artists, excludedSongIds, onClose, suggesting, setlistId } =
    props;
  const t = useTranslations("setlists.songs.addDialog");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [songKey, setSongKey] = useState("");
  // Ticked songs, in the order they were ticked (= the running order).
  const [selected, setSelected] = useState<string[]>([]);
  // Added while the dialog was open: hidden right away, before the page's
  // refreshed data arrives.
  const [justAdded, setJustAdded] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isAdding, startAdding] = useTransition();
  const suggest = useAddOrSuggest(props);
  const isPending = isAdding || suggest.isPending;

  const available = useMemo(() => {
    const excluded = new Set([...excludedSongIds, ...justAdded]);
    const artistNames = new Map(artists.map((a) => [a.id, a.name]));
    return songs
      .filter((song) => !excluded.has(song.id))
      .map((song) => ({
        id: song.id,
        title: song.title,
        artist: artistNames.get(song.artist_id) ?? "",
        tonality: song.tonality ?? "",
        tempo: song.tempo ?? null,
        tags: song.tags ?? [],
      }))
      .sort(
        (a, b) =>
          a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist),
      );
  }, [songs, artists, excludedSongIds, justAdded]);

  const tagOptions = useMemo(
    () =>
      [...new Set(available.flatMap((song) => song.tags))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [available],
  );
  const keyOptions = useMemo(
    () =>
      [...new Set(available.map((song) => song.tonality).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [available],
  );

  const matches = useMemo(() => {
    const byFilters = available.filter(
      (song) =>
        (!tag || song.tags.includes(tag)) &&
        (!songKey || song.tonality === songKey),
    );
    return filterBySearch(
      byFilters,
      ["title", "artist", "tonality"] as const,
      query,
    );
  }, [available, tag, songKey, query]);
  const visible = matches.slice(0, MAX_VISIBLE);
  const filtering = query !== "" || tag !== "" || songKey !== "";

  const toggle = (id: string, on: boolean) => {
    if (suggesting) {
      setSelected(on ? [id] : []);
      return;
    }
    setSelected((prev) =>
      on ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id),
    );
  };

  const addSelected = () => {
    const ids = selected;
    startAdding(async () => {
      const result = await addSongsToSetlist(setlistId, ids);
      if (!result.success || !result.data) {
        if (!result.success) {
          toastActionError(result, result.error || t("addFailed"));
        }
        return;
      }
      const { added, skipped, updated, outdated, notAdded, stoppedBy } =
        result.data;
      setJustAdded((prev) => [...prev, ...added, ...skipped]);
      setSelected((prev) =>
        prev.filter((id) => !added.includes(id) && !skipped.includes(id)),
      );
      added.forEach((id) => props.onAdded?.(id));
      if (stoppedBy) {
        toast.warning(
          t("addedPartial", {
            added: added.length,
            rest: notAdded,
            reason: stoppedBy,
          }),
          { duration: 10000 },
        );
      } else if (added.length > 0) {
        toast.success(t("addedMany", { count: added.length }));
      }
      if (skipped.length > 0) {
        toast.info(t("skippedNote", { count: skipped.length }));
      }
      // The band already had these songs: say what happened to its copy.
      if (updated.length > 0) {
        toast.info(t("copiesUpdated", { count: updated.length }));
      }
      if (outdated.length > 0) {
        toast.info(t("copiesOutdated", { count: outdated.length }), {
          duration: 10000,
        });
      }
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending || selected.length === 0) return;
    if (suggesting) {
      suggest.submit(selected[0], note);
      return;
    }
    addSelected();
  };

  const clearFilters = () => {
    setQuery("");
    setTag("");
    setSongKey("");
  };

  const listId = "add-song-list";

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("searchMine")}
      />
      {(tagOptions.length > 0 || keyOptions.length > 1) && (
        <div className="grid grid-cols-2 gap-2">
          {tagOptions.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="add-song-tag" className="text-xs">
                {t("filterTag")}
              </Label>
              <NativeSelect
                id="add-song-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={isPending}
              >
                <option value="">{t("allTags")}</option>
                {tagOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {keyOptions.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor="add-song-key" className="text-xs">
                {t("filterKey")}
              </Label>
              <NativeSelect
                id="add-song-key"
                value={songKey}
                onChange={(e) => setSongKey(e.target.value)}
                disabled={isPending}
              >
                <option value="">{t("allKeys")}</option>
                {keyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>
      )}

      <fieldset
        id={listId}
        className="max-h-[min(20rem,45dvh)] overflow-y-auto overscroll-contain rounded-lg border"
        aria-busy={isPending || undefined}
        disabled={isPending}
      >
        <legend className="sr-only">{t("listLabel")}</legend>
        {available.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {t("noMoreSongs")}
          </p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">{t("noMatch")}</p>
            {filtering && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                {t("clearFilters")}
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((song) => {
              const inputId = `add-song-${song.id}`;
              const checked = selected.includes(song.id);
              const details = [
                song.artist,
                song.tonality,
                song.tempo ? `${song.tempo} BPM` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={song.id}>
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2.5 pointer-coarse:py-3",
                      checked && "bg-primary/5",
                    )}
                  >
                    {suggesting ? (
                      <input
                        id={inputId}
                        type="radio"
                        name="add-song-choice"
                        className="accent-primary size-4 shrink-0"
                        checked={checked}
                        onChange={(e) => toggle(song.id, e.target.checked)}
                      />
                    ) : (
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggle(song.id, value === true)
                        }
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {song.title}
                      </span>
                      {details && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {details}
                        </span>
                      )}
                    </span>
                    {!suggesting && checked && (
                      <span
                        className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold tabular-nums"
                        aria-hidden
                      >
                        {selected.indexOf(song.id) + 1}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span role="status" aria-live="polite">
          {suggesting ? null : t("selectedCount", { count: selected.length })}
        </span>
        {matches.length > visible.length && (
          <span>
            {t("showingFirst", {
              shown: visible.length,
              total: matches.length,
            })}
          </span>
        )}
        {!suggesting && selected.length > 0 && (
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={() => setSelected([])}
            disabled={isPending}
          >
            {t("clearSelection")}
          </Button>
        )}
      </div>

      {props.band && !suggesting && (
        <p className="text-muted-foreground text-xs">{t("copyHint")}</p>
      )}
      {suggesting && (
        <NoteField value={note} onChange={setNote} disabled={isPending} />
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          {justAdded.length > 0 ? t("done") : tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isPending || selected.length === 0}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : suggesting ? (
            <Send className="mr-2 h-4 w-4" aria-hidden />
          ) : (
            <Plus className="mr-2 h-4 w-4" aria-hidden />
          )}
          {suggesting
            ? t("suggestButton")
            : t("addMany", { count: selected.length })}
        </Button>
      </DialogFooter>
    </form>
  );
}

function NoteField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("setlists.songs.addDialog");
  return (
    <div className="space-y-2">
      <Label htmlFor="suggest-note">
        {t("noteLabel")}{" "}
        <span className="text-muted-foreground font-normal">
          ({t("optional")})
        </span>
      </Label>
      <Textarea
        id="suggest-note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={t("notePlaceholder")}
        disabled={disabled}
      />
    </div>
  );
}

function RepertoirePicker(props: AddSongDialogProps & { suggesting: boolean }) {
  const { band, excludedSongIds, suggesting } = props;
  const t = useTranslations("setlists.songs.addDialog");
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<SetlistSong[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, startLoading] = useTransition();
  const [note, setNote] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const { submit, isPending } = useAddOrSuggest({
    ...props,
    onAdded: (songId) => {
      setAddedIds((prev) => [...prev, songId]);
      props.onAdded?.(songId);
    },
  });

  useEffect(() => {
    if (!band) return;
    const handle = window.setTimeout(() => {
      startLoading(async () => {
        const result = await searchBandRepertoire(band.id, query);
        if (result.success && result.data) {
          setSongs(result.data.data);
          setTotal(result.data.meta.total_items);
        } else if (!result.success) {
          toastActionError(result, result.error);
          setSongs([]);
        }
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [band, query]);

  const excluded = new Set([...excludedSongIds, ...addedIds]);

  return (
    <div className="space-y-3">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t("searchRepertoire")}
      />
      {suggesting && (
        <NoteField value={note} onChange={setNote} disabled={isPending} />
      )}
      <div
        className="max-h-72 overflow-y-auto rounded-lg border"
        aria-busy={loading}
      >
        {songs === null ? (
          <p className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("loading")}
          </p>
        ) : songs.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {query ? t("repertoireNoMatch", { query }) : t("repertoireEmpty")}
          </p>
        ) : (
          <ul className="divide-y">
            {songs.map((song) => {
              const inSetlist = excluded.has(song.id);
              return (
                <li
                  key={song.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{song.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {[
                        song.artist_name,
                        song.tonality,
                        song.tempo ? `${song.tempo} BPM` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {inSetlist ? (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {t("alreadyIn")}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={isPending}
                      onClick={() => {
                        setPendingId(song.id);
                        submit(song.id, note);
                      }}
                      aria-label={
                        suggesting
                          ? t("suggestNamed", { title: song.title })
                          : t("addNamed", { title: song.title })
                      }
                    >
                      {isPending && pendingId === song.id ? (
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden
                        />
                      ) : suggesting ? (
                        <Send className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      )}
                      <span className="sr-only sm:not-sr-only sm:ml-1">
                        {suggesting ? t("suggestShort") : t("addShort")}
                      </span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {songs && total > songs.length && (
        <p className="text-muted-foreground text-xs">
          {t("repertoireMore", { shown: songs.length, total })}
        </p>
      )}
    </div>
  );
}
