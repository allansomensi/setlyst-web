"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Song, Artist, TONALITIES, GENRES, Tonality, Genre } from "@/types/api";
import { createSong, updateSong } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDuration, parseDurationToSeconds } from "@/lib/utils";

interface SongDialogProps {
  song?: Song | null;
  artists: Artist[];
  isOpen: boolean;
  onClose: () => void;
}

export function SongDialog({
  song,
  artists,
  isOpen,
  onClose,
}: SongDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!song;

  const handleAction = (formData: FormData) => {
    const tempoStr = formData.get("tempo") as string;
    const durationStr = formData.get("duration") as string;

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
          toast.success("Song updated!");
          onClose();
        } else {
          const newSongId =
            "data" in result ? (result.data as Song)?.id : undefined;

          toast.success("Song created!", {
            description: "Would you like to add lyrics now?",
            action: {
              label: "Add lyrics",
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
        toast.error(result.error ?? "Error saving the song");
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
            <DialogTitle>{isEditing ? "Edit Song" : "Add Song"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the song data and metadata."
                : "Fill in the details. Lyrics can be added later."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title + Artist */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={song?.title}
                  required
                  disabled={isPending}
                  maxLength={255}
                  placeholder="e.g.: Neon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="artist_id">Artist *</Label>
                <select
                  id="artist_id"
                  name="artist_id"
                  className={inputClass}
                  defaultValue={song?.artist_id ?? ""}
                  required
                  disabled={isPending}
                >
                  <option value="" disabled>
                    Select artist
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
                <Label htmlFor="tonality">Key</Label>
                <select
                  id="tonality"
                  name="tonality"
                  className={inputClass}
                  defaultValue={song?.tonality ?? ""}
                  disabled={isPending}
                >
                  <option value="">None</option>
                  {TONALITIES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <select
                  id="genre"
                  name="genre"
                  className={inputClass}
                  defaultValue={song?.genre ?? ""}
                  disabled={isPending}
                >
                  <option value="">None</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempo">BPM</Label>
                <Input
                  id="tempo"
                  name="tempo"
                  type="number"
                  defaultValue={song?.tempo ?? ""}
                  disabled={isPending}
                  placeholder="120"
                  min="1"
                  max="500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  name="duration"
                  defaultValue={formatDuration(song?.duration)}
                  disabled={isPending}
                  placeholder="03:30"
                  pattern="^(\d{1,3}:\d{2})?$"
                  title="Format: mm:ss (e.g.: 03:30)"
                />
              </div>
            </div>

            {/* Lyrics info for editing */}
            {isEditing && (
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Lyrics</p>
                  <p className="text-muted-foreground text-xs">
                    {song.lyrics
                      ? `${song.lyrics.split("\n").length} lines registered`
                      : "No lyrics registered"}
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
                  Edit lyrics
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
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
