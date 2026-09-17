"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Song,
  Artist,
  TONALITIES,
  GENRES,
  Tonality,
  Genre,
  formatGenre,
} from "@/types/api";
import { createSong, updateSong } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileEdit } from "lucide-react";
import { toast } from "sonner";
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
}

// Owns the duration field's value and validity itself, rather than lifting
// them into SongDialog's state. It lives inside the <form key={...}> below,
// so React already gives it a fresh `useState(initialValue)` whenever that
// key changes (switching songs, or from editing to "new") — the same
// built-in reset the other, uncontrolled fields get from `defaultValue`.
// No effect needed to keep a stale value from leaking across songs.
function DurationField({
  initialValue,
  disabled,
}: {
  initialValue: string;
  disabled: boolean;
}) {
  const t = useTranslations("songs.dialog");
  const [duration, setDuration] = useState(initialValue);
  const durationValid = isValidDurationInput(duration);

  return (
    <div className="space-y-2">
      <Label htmlFor="duration">{t("durationLabel")}</Label>
      <Input
        id="duration"
        name="duration"
        value={duration}
        onChange={(e) => setDuration(sanitizeDurationInput(e.target.value))}
        disabled={disabled}
        placeholder={t("durationPlaceholder")}
        inputMode="numeric"
        aria-invalid={!durationValid}
        className={!durationValid ? "border-destructive" : undefined}
      />
      {!durationValid && (
        <p className="text-destructive text-xs">{t("durationInvalid")}</p>
      )}
    </div>
  );
}

export function SongDialog({
  song,
  artists,
  isOpen,
  onClose,
}: SongDialogProps) {
  const router = useRouter();
  const t = useTranslations("songs.dialog");
  const tCommon = useTranslations("common");

  const [isPending, startTransition] = useTransition();
  const isEditing = !!song;

  const handleAction = (formData: FormData) => {
    const tempoStr = formData.get("tempo") as string;
    const durationStr = (formData.get("duration") as string) || "";

    if (!isValidDurationInput(durationStr)) {
      toast.error(t("durationInvalid"));
      return;
    }

    const data = {
      title: formData.get("title") as string,
      artist_id: formData.get("artist_id") as string,
      tempo: tempoStr ? parseInt(tempoStr, 10) : null,
      tonality: (formData.get("tonality") as Tonality) || null,
      genre: (formData.get("genre") as Genre) || null,
      duration: durationStr ? parseDurationToSeconds(durationStr) : null,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateSong(song.id, data)
        : await createSong(data);

      if (result.success) {
        if (isEditing) {
          toast.success(t("updated"));
          onClose();
        } else {
          const newSongId =
            "data" in result ? (result.data as Song)?.id : undefined;

          toast.success(t("created"), {
            description: t("addLyricsNow"),
            action: {
              label: t("addLyricsAction"),
              onClick: () => {
                if (newSongId) {
                  router.push(`/dashboard/songs/${newSongId}/lyrics`);
                } else {
                  router.push("/dashboard/songs");
                }
              },
            },
          });
          onClose();
        }
      } else {
        toast.error(result.error ?? t("saveFailed"));
      }
    });
  };

  const inputClass =
    "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-150">
        <form action={handleAction} key={song?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("editTitle") : t("addTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? t("editDescription") : t("addDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title + Artist */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t("titleLabel")} *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={song?.title}
                  required
                  disabled={isPending}
                  maxLength={255}
                  placeholder={t("titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist_id">{t("artistLabel")} *</Label>
                <select
                  id="artist_id"
                  name="artist_id"
                  className={inputClass}
                  defaultValue={song?.artist_id ?? ""}
                  required
                  disabled={isPending}
                >
                  <option value="" disabled>
                    {t("selectArtist")}
                  </option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tonality + Genre + Tempo + Duration */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="tonality">{t("keyLabel")}</Label>
                <select
                  id="tonality"
                  name="tonality"
                  className={inputClass}
                  defaultValue={song?.tonality ?? ""}
                  disabled={isPending}
                >
                  <option value="">{t("noneOption")}</option>
                  {TONALITIES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">{t("genreLabel")}</Label>
                <select
                  id="genre"
                  name="genre"
                  className={inputClass}
                  defaultValue={song?.genre ?? ""}
                  disabled={isPending}
                >
                  <option value="">{t("noneOption")}</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {formatGenre(g)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempo">{t("bpmLabel")}</Label>
                <Input
                  id="tempo"
                  name="tempo"
                  type="number"
                  defaultValue={song?.tempo ?? ""}
                  disabled={isPending}
                  placeholder={t("bpmPlaceholder")}
                  min="1"
                  max="500"
                />
              </div>

              <DurationField
                initialValue={
                  song?.duration ? formatDuration(song.duration) : ""
                }
                disabled={isPending}
              />
            </div>

            {/* Lyrics info for editing */}
            {isEditing && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
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
                  onClick={() => {
                    onClose();
                    router.push(`/dashboard/songs/${song.id}/lyrics`);
                  }}
                >
                  <FileEdit className="h-3.5 w-3.5" />
                  {t("editLyrics")}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
