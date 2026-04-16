"use client";

import { useState, useTransition } from "react";
import { Song, Artist } from "@/types/api";
import { removeSongFromSetlist } from "../../actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddSongDialog } from "./add-song-dialog";

interface SetlistSongsManagerProps {
  setlistId: string;
  setlistSongs: Song[];
  allSongs: Song[];
  artists: Artist[];
}

export function SetlistSongsManager({
  setlistId,
  setlistSongs,
  allSongs,
  artists,
}: SetlistSongsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getArtistName = (artistId: string) => {
    const artist = artists.find((a) => a.id === artistId);
    return artist ? artist.name : "Unknown Artist";
  };

  const handleRemove = (songId: string) => {
    if (!confirm("Remove this song from the setlist?")) return;

    startTransition(async () => {
      const result = await removeSongFromSetlist(setlistId, songId);
      if (result.success) {
        toast.success("Song removed from setlist");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Songs in this Setlist</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Song
        </Button>
      </div>

      <div
        className={`bg-background rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Pos</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setlistSongs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground h-24 text-center"
                >
                  No songs added yet.
                </TableCell>
              </TableRow>
            ) : (
              setlistSongs.map((song, index) => (
                <TableRow key={song.id}>
                  <TableCell className="text-muted-foreground font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{song.title}</TableCell>
                  <TableCell>{getArtistName(song.artist_id)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleRemove(song.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddSongDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        setlistId={setlistId}
        allSongs={allSongs}
        artists={artists}
        currentCount={setlistSongs.length}
        existingSongIds={setlistSongs.map((s) => s.id)}
      />
    </div>
  );
}
