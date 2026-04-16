"use client";

import { useTransition } from "react";
import { Song, Artist } from "@/types/api";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [isPending, startTransition] = useTransition();
  const isEditing = !!song;

  const handleAction = (formData: FormData) => {
    const data = {
      title: formData.get("title") as string,
      artist_id: formData.get("artist_id") as string,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateSong(song.id, data)
        : await createSong(data);

      if (result.success) {
        toast.success(isEditing ? "Song updated!" : "Song created!");
        onClose();
      } else {
        toast.error(result.error || "Failed to save song");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form action={handleAction} key={song?.id || "new"}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Song" : "Add New Song"}
            </DialogTitle>
            <DialogDescription>
              Enter the song title and select the artist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={song?.title}
                required
                disabled={isPending}
                maxLength={255}
                placeholder="e.g., Neon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist_id">Artist</Label>
              <select
                id="artist_id"
                name="artist_id"
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                defaultValue={song?.artist_id || ""}
                required
                disabled={isPending}
              >
                <option value="" disabled>
                  Select an artist
                </option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
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
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
