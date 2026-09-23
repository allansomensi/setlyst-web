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
  searchBandRepertoire,
  suggestSongForSetlist,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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
  /** Called after a song was added (the dialog closes itself). */
  onAdded?: (songId: string) => void;
  /** Band setlists: repertoire tab and suggestions. */
  band?: AddSongBandContext;
}

/**
 * Picks one song and adds it to the end of a setlist.
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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

/** Adds (or suggests) one song, with the right toast. */
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
        toast.success(t("added"));
        onAdded?.(songId);
        onClose();
      } else {
        toastActionError(result, result.error || t("addFailed"));
      }
    });
  };

  return { submit, isPending };
}

function MySongsForm(props: AddSongDialogProps & { suggesting: boolean }) {
  const { songs, artists, excludedSongIds, onClose, suggesting } = props;
  const t = useTranslations("setlists.songs.addDialog");
  const tCommon = useTranslations("common");
  const [songId, setSongId] = useState("");
  const [note, setNote] = useState("");
  const { submit, isPending } = useAddOrSuggest(props);

  const options = useMemo(() => {
    const excluded = new Set(excludedSongIds);
    const artistNames = new Map(artists.map((a) => [a.id, a.name]));
    return songs
      .filter((song) => !excluded.has(song.id))
      .map((song) => ({
        id: song.id,
        label: [song.title, artistNames.get(song.artist_id)]
          .filter(Boolean)
          .join(" · "),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [songs, artists, excludedSongIds]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (songId) submit(songId, note);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="space-y-2 py-2">
        <Label htmlFor="add-song-select">{t("songLabel")}</Label>
        <NativeSelect
          id="add-song-select"
          value={songId}
          onChange={(e) => setSongId(e.target.value)}
          required
          disabled={isPending || options.length === 0}
        >
          <option value="" disabled>
            {options.length === 0 ? t("noMoreSongs") : t("selectSong")}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        {props.band && !suggesting && (
          <p className="text-muted-foreground text-xs">{t("copyHint")}</p>
        )}
      </div>
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
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isPending || !songId}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : suggesting ? (
            <Send className="mr-2 h-4 w-4" aria-hidden />
          ) : null}
          {suggesting ? t("suggestButton") : t("addButton")}
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
  const { submit, isPending } = useAddOrSuggest(props);

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

  const excluded = new Set(excludedSongIds);

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
