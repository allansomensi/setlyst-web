"use client";

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileEdit, Loader2, Plus } from "lucide-react";
import { useAppRouter } from "@/hooks/use-app-router";
import {
  Song,
  Artist,
  TONALITIES,
  Tonality,
  Genre,
  genreOptions,
} from "@/types/api";
import { createSong, updateSong } from "../actions";
import { createArtist } from "../../artists/actions";
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
import { toast } from "@/lib/toast";
import { FieldError } from "@/components/ui/field-error";
import { DiscardChangesDialog } from "@/components/ui/discard-changes-dialog";
import { useDialogCloseGuard } from "@/hooks/use-dialog-close-guard";
import { fieldA11y, focusFirstError, type FieldErrors } from "@/lib/forms";
import { toastActionError } from "@/lib/action-toast";
import { isNoChangeError } from "@/lib/api-errors";
import { TagInput } from "@/components/tags/tag-input";
import { EnergyPicker } from "@/components/content/energy";
import { LinksEditor } from "@/components/content/links-editor";
import {
  draftsToLinks,
  newLinkDraft,
  type LinkDraft,
  type LinkDraftIssue,
} from "@/lib/content-links";
import {
  MAX_CAPO,
  MAX_PERFORMANCE_NOTES_LENGTH,
  MAX_TUNING_LENGTH,
  MIN_CAPO,
  TIME_SIGNATURES,
  TUNING_SUGGESTIONS,
  isEnergyLevel,
  type EnergyLevel,
} from "@/lib/song-fields";
import {
  formatDuration,
  parseDurationToSeconds,
  sanitizeDurationInput,
  isValidDurationInput,
} from "@/lib/utils";

interface SongDialogProps {
  song?: Song | null;
  artists: Artist[];
  isOpen: boolean;
  onClose: () => void;
  /** Tags already used in the library, offered as suggestions. */
  tagSuggestions?: string[];
  /** Called with the saved song id (create and edit). */
  onSaved?: (songId: string) => void;
  /**
   * Band songs: the artist belongs to the band, so the picker only shows
   * it and offers no "new artist" (that would create a personal one).
   */
  lockArtist?: boolean;
}

type SongTab = "basic" | "music" | "links" | "tags";

type SongField = "title" | "artist" | "duration" | "tempo" | "links";

// The BPM range the API accepts. The form is `noValidate` (so the errors
// read in the app's own words), which also switches off the input's
// min/max, so the range is checked by hand on submit.
const MIN_TEMPO = 1;
const MAX_TEMPO = 500;

/** Validation order = focus order; each field with the tab it lives on. */
const FIELD_ORDER: readonly {
  key: SongField;
  id: string | readonly string[];
  tab: SongTab;
}[] = [
  { key: "title", id: "song-title", tab: "basic" },
  { key: "artist", id: ["song-artist", "song-new-artist"], tab: "basic" },
  { key: "duration", id: "song-duration", tab: "basic" },
  { key: "tempo", id: "song-tempo", tab: "music" },
  { key: "links", id: "song-links-error-anchor", tab: "links" },
];

/** Everything the form edits, as typed (strings for the number fields). */
interface SongFormState {
  title: string;
  artistId: string;
  tonality: Tonality | "";
  genre: Genre | "";
  tempo: string;
  duration: string;
  tags: string[];
  energy: EnergyLevel | null;
  timeSignature: string;
  /** "" = not informed. */
  capo: string;
  tuning: string;
  performanceNotes: string;
  links: LinkDraft[];
  /** Versions only: what sets this one apart ("Simplificada"). */
  versionLabel: string;
}

function initialState(song?: Song | null): SongFormState {
  return {
    title: song?.title ?? "",
    artistId: song?.artist_id ?? "",
    tonality: song?.tonality ?? "",
    genre: song?.genre ?? "",
    tempo: song?.tempo != null ? String(song.tempo) : "",
    duration: song?.duration ? formatDuration(song.duration) : "",
    tags: song?.tags ?? [],
    energy: isEnergyLevel(song?.energy) ? song.energy : null,
    timeSignature: song?.time_signature ?? "",
    capo: song?.capo != null ? String(song.capo) : "",
    tuning: song?.tuning ?? "",
    performanceNotes: song?.performance_notes ?? "",
    links: (song?.links ?? []).map((link) => newLinkDraft(link)),
    versionLabel: song?.version_label ?? "",
  };
}

/**
 * Creates or edits a song's details (lyrics have their own editor), in
 * four tabs: basics, musical details, links and tags.
 *
 * Fully controlled, so nothing typed is lost when saving fails, and a
 * problem in another tab switches to it. The parent remounts it per song
 * (`key`), which resets the state.
 */
export function SongDialog({
  song,
  artists,
  isOpen,
  onClose,
  tagSuggestions = [],
  onSaved,
  lockArtist = false,
}: SongDialogProps) {
  const router = useAppRouter();
  const t = useTranslations("songs.dialog");
  const locale = useLocale();
  const tFields = useTranslations("songs");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<SongFormState>(() => initialState(song));
  // What the form opened with, to tell whether closing loses anything.
  const [initialForm] = useState<SongFormState>(() => initialState(song));
  const [errors, setErrors] = useState<FieldErrors<SongField>>({});
  const [tab, setTab] = useState<SongTab>("basic");
  const [linkIssues, setLinkIssues] = useState<Record<string, LinkDraftIssue>>(
    {},
  );
  // Artists created from this dialog, until the page data catches up.
  const [createdArtists, setCreatedArtists] = useState<Artist[]>([]);
  const isEditing = !!song;
  // Versions are named; an original has no name to edit.
  const isVersion = !!(song?.version_of || song?.version_label);

  const artistOptions = [
    ...artists,
    ...createdArtists.filter((a) => !artists.some((b) => b.id === a.id)),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const FIELD_OF: Partial<Record<keyof SongFormState, SongField>> = {
    title: "title",
    artistId: "artist",
    duration: "duration",
    tempo: "tempo",
    links: "links",
  };

  const set = <K extends keyof SongFormState>(
    key: K,
    value: SongFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Editing a field clears its error; the rest stay until the next try.
    const field = FIELD_OF[key];
    if (field && errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const durationValid = isValidDurationInput(form.duration);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  // Where to go once the dialog has actually closed ("Edit lyrics"). Set
  // before asking to close, so the navigation happens only when the close
  // goes through: straight away when clean, after "Discard" when dirty,
  // and never when the user picks "Keep editing".
  const navigateAfterCloseRef = useRef<string | null>(null);
  const closeGuard = useDialogCloseGuard({
    isDirty,
    isPending,
    onClose: useCallback(() => {
      onClose();
      const href = navigateAfterCloseRef.current;
      navigateAfterCloseRef.current = null;
      if (href) router.push(href);
    }, [onClose, router]),
  });
  const discardDialog = {
    ...closeGuard.discard,
    onKeepEditing: () => {
      navigateAfterCloseRef.current = null;
      closeGuard.discard.onKeepEditing();
    },
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A double Enter / double tap must not create the song twice.
    if (isPending) return;

    const nextErrors: FieldErrors<SongField> = {};
    if (!form.title.trim()) nextErrors.title = t("titleRequired");
    if (!form.artistId) nextErrors.artist = t("artistRequired");
    if (!durationValid) nextErrors.duration = t("durationInvalid");
    if (form.tempo.trim()) {
      // Number() rather than parseInt: "120abc" or "1e3" must not pass.
      const tempo = Number(form.tempo);
      if (!Number.isInteger(tempo) || tempo < MIN_TEMPO || tempo > MAX_TEMPO) {
        nextErrors.tempo = t("tempoInvalid", {
          min: MIN_TEMPO,
          max: MAX_TEMPO,
        });
      }
    }
    const links = draftsToLinks(form.links);
    if (!links.ok) {
      setLinkIssues(links.issues);
      nextErrors.links = t("linksInvalid");
    } else {
      setLinkIssues({});
    }

    const first = FIELD_ORDER.find(({ key }) => nextErrors[key]);
    if (first || !links.ok) {
      setErrors(nextErrors);
      if (first) setTab(first.tab);
      focusFirstError(nextErrors, FIELD_ORDER);
      return;
    }
    setErrors({});

    const data = {
      title: form.title,
      artist_id: form.artistId,
      tempo: form.tempo.trim() ? Number(form.tempo) : null,
      tonality: form.tonality || null,
      genre: form.genre || null,
      duration: form.duration ? parseDurationToSeconds(form.duration) : null,
      tags: form.tags,
      energy: form.energy,
      time_signature: form.timeSignature || null,
      capo: form.capo === "" ? null : parseInt(form.capo, 10),
      tuning: form.tuning.trim() || null,
      performance_notes: form.performanceNotes.trim() || null,
      links: links.links,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateSong(song.id, {
            ...data,
            ...(isVersion
              ? { version_label: form.versionLabel.trim() || null }
              : {}),
          })
        : await createSong(data);

      if (!result.success) {
        toastActionError(result, result.error ?? t("saveFailed"));
        if (isNoChangeError(result)) onClose();
        return;
      }

      if (isEditing) {
        toast.success(t("updated"));
        onSaved?.(song.id);
        onClose();
        return;
      }

      const newSongId =
        "data" in result ? (result.data as Song | undefined)?.id : undefined;
      if (newSongId) onSaved?.(newSongId);
      toast.success(t("created"), {
        description: t("addLyricsNow"),
        action: newSongId
          ? {
              label: t("addLyricsAction"),
              onClick: () =>
                router.push(`/dashboard/songs/${newSongId}/lyrics`),
            }
          : undefined,
      });
      onClose();
    });
  };

  const notesLength = form.performanceNotes.length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={closeGuard.onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? t("editTitle") : t("addTitle")}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? t("editDescription") : t("addDescription")}
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as SongTab)}
              className="py-4"
            >
              {/* Phones: the four tabs share the full width evenly. */}
              <TabsList className="w-full sm:w-fit [&>*]:flex-1 sm:[&>*]:flex-none">
                <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
                <TabsTrigger value="music">
                  {/* Four tabs across a phone: the short label there. */}
                  <span className="sm:hidden">{t("tabs.musicShort")}</span>
                  <span className="hidden sm:inline">{t("tabs.music")}</span>
                </TabsTrigger>
                <TabsTrigger value="links">
                  {t("tabs.links")}
                  {form.links.length > 0 && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {form.links.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tags">
                  {t("tabs.tags")}
                  {form.tags.length > 0 && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {form.tags.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="song-title">{t("titleLabel")} *</Label>
                    <Input
                      id="song-title"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      required
                      aria-required
                      disabled={isPending}
                      maxLength={255}
                      placeholder={t("titlePlaceholder")}
                      {...fieldA11y("song-title", errors.title)}
                    />
                    <FieldError fieldId="song-title" message={errors.title} />
                  </div>
                  <ArtistField
                    artists={artistOptions}
                    value={form.artistId}
                    onChange={(id) => set("artistId", id)}
                    onCreated={(artist) => {
                      setCreatedArtists((prev) => [...prev, artist]);
                      set("artistId", artist.id);
                    }}
                    disabled={isPending}
                    locked={lockArtist}
                    error={errors.artist}
                  />
                </div>

                {isVersion && (
                  <div className="space-y-2">
                    <Label htmlFor="song-version-label">
                      {t("versionLabel")}
                    </Label>
                    <Input
                      id="song-version-label"
                      value={form.versionLabel}
                      onChange={(e) => set("versionLabel", e.target.value)}
                      disabled={isPending}
                      maxLength={60}
                      placeholder={t("versionLabelPlaceholder")}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="song-genre">{t("genreLabel")}</Label>
                    <NativeSelect
                      id="song-genre"
                      value={form.genre}
                      onChange={(e) =>
                        set("genre", e.target.value as Genre | "")
                      }
                      disabled={isPending}
                    >
                      <option value="">{t("noneOption")}</option>
                      {genreOptions(locale).map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="song-duration">{t("durationLabel")}</Label>
                    <Input
                      id="song-duration"
                      value={form.duration}
                      onChange={(e) =>
                        set("duration", sanitizeDurationInput(e.target.value))
                      }
                      disabled={isPending}
                      placeholder={t("durationPlaceholder")}
                      inputMode="numeric"
                      {...fieldA11y(
                        "song-duration",
                        errors.duration ??
                          (durationValid ? null : t("durationInvalid")),
                      )}
                    />
                    <FieldError
                      fieldId="song-duration"
                      message={
                        errors.duration ??
                        (durationValid ? null : t("durationInvalid"))
                      }
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{t("lyricsTitle")}</p>
                      <p className="text-muted-foreground text-xs">
                        {song.lyrics
                          ? t("lyricsLines", {
                              count: song.lyrics.split("\n").length,
                            })
                          : t("noLyrics")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={isPending}
                      onClick={() => {
                        // Through the close guard: leaving for the lyrics
                        // editor used to drop unsaved edits silently.
                        navigateAfterCloseRef.current = `/dashboard/songs/${song.id}/lyrics`;
                        closeGuard.requestClose();
                      }}
                    >
                      <FileEdit className="h-3.5 w-3.5" aria-hidden />
                      {t("editLyrics")}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="music" className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="song-tonality">{t("keyLabel")}</Label>
                    <NativeSelect
                      id="song-tonality"
                      value={form.tonality}
                      onChange={(e) =>
                        set("tonality", e.target.value as Tonality | "")
                      }
                      disabled={isPending}
                    >
                      <option value="">{t("noneOption")}</option>
                      {TONALITIES.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="song-tempo">{t("bpmLabel")}</Label>
                    <Input
                      id="song-tempo"
                      type="number"
                      inputMode="numeric"
                      value={form.tempo}
                      onChange={(e) => set("tempo", e.target.value)}
                      disabled={isPending}
                      placeholder={t("bpmPlaceholder")}
                      min={MIN_TEMPO}
                      max={MAX_TEMPO}
                      {...fieldA11y("song-tempo", errors.tempo)}
                    />
                    <FieldError fieldId="song-tempo" message={errors.tempo} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="song-time-signature">
                      {t("timeSignatureLabel")}
                    </Label>
                    <NativeSelect
                      id="song-time-signature"
                      value={form.timeSignature}
                      onChange={(e) => set("timeSignature", e.target.value)}
                      disabled={isPending}
                    >
                      <option value="">{t("noneOption")}</option>
                      {TIME_SIGNATURES.map((ts) => (
                        <option key={ts} value={ts}>
                          {ts}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="song-capo">{t("capoLabel")}</Label>
                    <NativeSelect
                      id="song-capo"
                      value={form.capo}
                      onChange={(e) => set("capo", e.target.value)}
                      disabled={isPending}
                    >
                      <option value="">{t("noneOption")}</option>
                      {Array.from(
                        { length: MAX_CAPO - MIN_CAPO + 1 },
                        (_, i) => MIN_CAPO + i,
                      ).map((fret) => (
                        <option key={fret} value={String(fret)}>
                          {fret === 0
                            ? tFields("capo.none")
                            : tFields("capo.fret", { fret })}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="song-tuning">{t("tuningLabel")}</Label>
                  <Input
                    id="song-tuning"
                    list="song-tuning-suggestions"
                    value={form.tuning}
                    onChange={(e) => set("tuning", e.target.value)}
                    disabled={isPending}
                    maxLength={MAX_TUNING_LENGTH}
                    placeholder={t("tuningPlaceholder")}
                    autoComplete="off"
                  />
                  <datalist id="song-tuning-suggestions">
                    {TUNING_SUGGESTIONS.map((key) => (
                      <option
                        key={key}
                        value={tFields(`tuning.suggestions.${key}`)}
                      />
                    ))}
                  </datalist>
                  <p className="text-muted-foreground text-xs">
                    {t("tuningHint")}
                  </p>
                </div>

                <div className="space-y-2">
                  <span
                    id="song-energy-label"
                    className="text-sm leading-none font-medium"
                  >
                    {t("energyLabel")}
                  </span>
                  <p className="text-muted-foreground text-xs">
                    {t("energyHint")}
                  </p>
                  <EnergyPicker
                    id="song-energy"
                    value={form.energy}
                    onChange={(value) => set("energy", value)}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="song-notes">{t("notesLabel")}</Label>
                  <Textarea
                    id="song-notes"
                    value={form.performanceNotes}
                    onChange={(e) => set("performanceNotes", e.target.value)}
                    disabled={isPending}
                    maxLength={MAX_PERFORMANCE_NOTES_LENGTH}
                    placeholder={t("notesPlaceholder")}
                    rows={4}
                    aria-describedby="song-notes-count"
                  />
                  <p
                    id="song-notes-count"
                    className="text-muted-foreground text-right text-xs tabular-nums"
                  >
                    {t("charCount", {
                      count: notesLength,
                      max: MAX_PERFORMANCE_NOTES_LENGTH,
                    })}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="links" className="space-y-3 pt-2">
                {/* Focus target when a link is invalid: the summary is read
                  first, then each row shows its own problem. */}
                <div
                  id="song-links-error-anchor"
                  tabIndex={-1}
                  className="outline-none"
                >
                  <FieldError fieldId="song-links" message={errors.links} />
                </div>
                <LinksEditor
                  idPrefix="song-links"
                  value={form.links}
                  onChange={(links) => {
                    set("links", links);
                    setLinkIssues({});
                  }}
                  issues={linkIssues}
                  disabled={isPending}
                />
              </TabsContent>

              <TabsContent value="tags" className="space-y-2 pt-2">
                <Label htmlFor="song-tags">{t("tagsLabel")}</Label>
                <TagInput
                  id="song-tags"
                  value={form.tags}
                  onChange={(tags) => set("tags", tags)}
                  suggestions={tagSuggestions}
                  disabled={isPending}
                />
                <p className="text-muted-foreground text-xs">{t("tagsHint")}</p>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeGuard.requestClose}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                aria-busy={isPending || undefined}
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                )}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog {...discardDialog} />
    </>
  );
}

/**
 * The artist picker, with a way to add an artist on the spot: a new
 * account has none, and a required select with nothing to choose from
 * used to be a dead end for creating the very first song.
 */
function ArtistField({
  artists,
  value,
  onChange,
  onCreated,
  disabled,
  locked = false,
  error,
}: {
  artists: Artist[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (artist: Artist) => void;
  disabled: boolean;
  locked?: boolean;
  error?: string;
}) {
  const t = useTranslations("songs.dialog");
  const tCommon = useTranslations("common");
  const [isCreating, setIsCreating] = useState(artists.length === 0 && !locked);
  const [name, setName] = useState("");
  const [isSaving, startSaving] = useTransition();

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startSaving(async () => {
      const result = await createArtist({ name: trimmed });
      if (!result.success) {
        toastActionError(result, result.error ?? t("artistCreateFailed"));
        return;
      }
      const artist = (result as { data?: Artist }).data;
      if (artist?.id) {
        onCreated(artist);
        toast.success(t("artistCreated", { name: artist.name }));
      }
      setName("");
      setIsCreating(false);
    });
  };

  if (isCreating) {
    return (
      <div className="space-y-2">
        <Label htmlFor="song-new-artist">{t("newArtistLabel")} *</Label>
        <div className="flex gap-2">
          <Input
            id="song-new-artist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter creates the artist instead of submitting the song.
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
            maxLength={255}
            placeholder={t("newArtistPlaceholder")}
            disabled={disabled || isSaving}
            autoFocus={artists.length > 0}
            {...fieldA11y("song-new-artist", error)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={create}
            disabled={disabled || isSaving || !name.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              t("createArtist")
            )}
          </Button>
        </div>
        <FieldError fieldId="song-new-artist" message={error} />
        {artists.length === 0 ? (
          <p className="text-muted-foreground text-xs">{t("noArtistsYet")}</p>
        ) : (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            onClick={() => setIsCreating(false)}
          >
            {tCommon("cancel")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="song-artist">{t("artistLabel")} *</Label>
        {!locked && (
          <button
            type="button"
            className="text-primary relative inline-flex items-center gap-1 text-xs leading-none font-medium underline-offset-2 after:absolute after:-inset-2.5 after:content-[''] hover:underline disabled:opacity-50 pointer-fine:after:hidden"
            onClick={() => setIsCreating(true)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" aria-hidden />
            {t("newArtistAction")}
          </button>
        )}
      </div>
      <NativeSelect
        id="song-artist"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        aria-required
        disabled={disabled || locked}
        {...fieldA11y("song-artist", error)}
      >
        <option value="" disabled>
          {t("selectArtist")}
        </option>
        {artists.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </NativeSelect>
      <FieldError fieldId="song-artist" message={error} />
    </div>
  );
}
