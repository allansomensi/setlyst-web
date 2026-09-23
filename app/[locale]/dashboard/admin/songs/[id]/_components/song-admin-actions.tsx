"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { TagInput } from "@/components/tags/tag-input";
import { useRouter } from "@/i18n/routing";
import { toastActionError } from "@/lib/action-toast";
import {
  formatDuration,
  isValidDurationInput,
  parseDurationToSeconds,
  sanitizeDurationInput,
} from "@/lib/utils";
import { TONALITIES, type SetlistSong, type Tonality } from "@/types/api";
import { deleteSongAsAdmin, updateSongAsAdmin } from "../../../actions";

/**
 * Admin-only edit and delete of someone else's song. Every change is
 * stamped with the admin's name ("last modified by") and audited.
 */
export function SongAdminActions({ song }: { song: SetlistSong }) {
  const t = useTranslations("staff.songDetail");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(song.title);
  const [tempo, setTempo] = useState(song.tempo ? String(song.tempo) : "");
  const [tonality, setTonality] = useState<string>(song.tonality ?? "");
  const [duration, setDuration] = useState(
    song.duration ? formatDuration(song.duration) : "",
  );
  const [tags, setTags] = useState(song.tags);
  const [lyrics, setLyrics] = useState(song.lyrics ?? "");

  const tempoNumber = tempo ? Number(tempo) : null;
  const tempoValid =
    tempoNumber === null || (tempoNumber >= 1 && tempoNumber <= 500);
  const valid =
    title.trim().length > 0 && tempoValid && isValidDurationInput(duration);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    startTransition(async () => {
      const result = await updateSongAsAdmin(song.id, {
        title: title.trim(),
        tempo: tempoNumber,
        tonality: (tonality || null) as Tonality | null,
        duration: duration ? parseDurationToSeconds(duration) : null,
        tags,
        lyrics: lyrics.trim() ? lyrics : null,
      });
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("saved"));
      setEditing(false);
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteSongAsAdmin(song.id);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("deleted", { title: song.title }));
      router.push("/dashboard/admin/songs");
    });
  };

  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        {tCommon("edit")}
      </Button>
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setDeleting(true)}
        aria-label={t("delete")}
        title={t("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog
        open={editing}
        onOpenChange={(open) => !isPending && setEditing(open)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("editTitle")}</DialogTitle>
              <DialogDescription>{t("editDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="admin-song-title">{t("title")}</Label>
              <Input
                id="admin-song-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-song-key">{t("key")}</Label>
                <select
                  id="admin-song-key"
                  value={tonality}
                  onChange={(e) => setTonality(e.target.value)}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">—</option>
                  {TONALITIES.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-song-bpm">{t("bpm")}</Label>
                <Input
                  id="admin-song-bpm"
                  inputMode="numeric"
                  value={tempo}
                  onChange={(e) =>
                    setTempo(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  aria-invalid={!tempoValid}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-song-duration">{t("duration")}</Label>
                <Input
                  id="admin-song-duration"
                  inputMode="numeric"
                  value={duration}
                  placeholder="3:45"
                  onChange={(e) =>
                    setDuration(sanitizeDurationInput(e.target.value))
                  }
                  aria-invalid={!isValidDurationInput(duration)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-song-tags">{t("tags")}</Label>
              <TagInput id="admin-song-tags" value={tags} onChange={setTags} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-song-lyrics">{t("lyrics")}</Label>
              <Textarea
                id="admin-song-lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                spellCheck={false}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={!valid || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("deleteTitle", { title: song.title })}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        destructive
        pending={isPending}
        onConfirm={remove}
      />
    </div>
  );
}
