"use client";

import { useState, useTransition } from "react";
import { Song, Artist } from "@/types/api";
import { deleteSong } from "../actions";
import { SongDialog } from "./song-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SongsTableProps {
  initialSongs: Song[];
  artists: Artist[];
}

export function SongsTable({ initialSongs, artists }: SongsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const handleOpenDialog = (song?: Song) => {
    setEditingSong(song || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;

    startTransition(async () => {
      const result = await deleteSong(id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete song");
      } else {
        toast.success("Song deleted successfully");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Songs</h1>
          <p className="text-muted-foreground">
            Manage your band&apos;s songs.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Song
        </Button>
      </div>

      <div
        className={`bg-background rounded-md border ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead className="hidden md:table-cell">Key</TableHead>
              <TableHead className="hidden lg:table-cell">Genre</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                BPM
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialSongs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No songs found. Start by adding one.
                </TableCell>
              </TableRow>
            ) : (
              initialSongs.map((song) => {
                const artist = artists.find((a) => a.id === song.artist_id);
                return (
                  <TableRow key={song.id}>
                    <TableCell className="font-medium">{song.title}</TableCell>
                    <TableCell>{artist?.name || "Unknown Artist"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {song.tonality ? (
                        <Badge variant="secondary" className="px-1.5 font-mono">
                          {song.tonality}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {song.genre || "-"}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs sm:table-cell">
                      {song.tempo || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenDialog(song)}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(song.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <SongDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        song={editingSong}
        artists={artists}
      />
    </div>
  );
}
