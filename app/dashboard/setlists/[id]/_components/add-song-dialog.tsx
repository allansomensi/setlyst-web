"use client";

import { useTransition } from "react";
import { Song, Artist } from "@/types/api";
import { addSongToSetlist } from "../../actions";
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

interface AddSongDialogProps {
  setlistId: string;
  allSongs: Song[];
  artists: Artist[];
  currentCount: number;
  existingSongIds: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function AddSongDialog({
  setlistId,
  allSongs,
  artists,
  currentCount,
  existingSongIds,
  isOpen,
  onClose,
}: AddSongDialogProps) {
  const [isPending, startTransition] = useTransition();

  const availableSongs = allSongs.filter(
    (song) => !existingSongIds.includes(song.id),
  );

  const getArtistName = (artistId: string) => {
    const artist = artists.find((a) => a.id === artistId);
    return artist ? artist.name : "";
  };

  const handleAction = (formData: FormData) => {
    const data = {
      song_id: formData.get("song_id") as string,
      position: parseInt(formData.get("position") as string, 10),
    };

    startTransition(async () => {
      const result = await addSongToSetlist(setlistId, data);

      if (result.success) {
        toast.success("Song added to setlist!");
        onClose();
      } else {
        toast.error(result.error || "Failed to add song");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form action={handleAction}>
          <DialogHeader>
            <DialogTitle>Add Song to Setlist</DialogTitle>
            <DialogDescription>
              Select a song from your repertoire to add to this setlist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="song_id">Song</Label>
              <select
                id="song_id"
                name="song_id"
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                required
                disabled={isPending || availableSongs.length === 0}
                defaultValue=""
              >
                <option value="" disabled>
                  {availableSongs.length === 0
                    ? "No more songs available"
                    : "Select a song"}
                </option>
                {availableSongs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title} - {getArtistName(song.artist_id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                type="number"
                min="1"
                defaultValue={currentCount + 1}
                required
                disabled={isPending}
              />
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
            <Button
              type="submit"
              disabled={isPending || availableSongs.length === 0}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Add Song
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
