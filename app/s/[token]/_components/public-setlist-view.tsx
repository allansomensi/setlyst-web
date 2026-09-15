"use client";

import { useState } from "react";
import { PublicSetlist } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Download, ListMusic, Music } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { PublicExportPdfDialog } from "./public-export-pdf-dialog";

interface PublicSetlistViewProps {
  setlist: PublicSetlist;
  token: string;
}

export function PublicSetlistView({ setlist, token }: PublicSetlistViewProps) {
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Music className="text-primary h-5 w-5" />
          <span className="text-muted-foreground text-sm font-medium">
            Setlyst
          </span>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {setlist.title}
            </h1>
            {setlist.description && (
              <p className="text-muted-foreground mt-1">
                {setlist.description}
              </p>
            )}
            <div className="text-muted-foreground bg-muted/50 mt-3 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
              <Clock className="text-primary h-4 w-4" />
              <span>Total: {formatDuration(setlist.total_duration)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="gap-2"
            onClick={() => setIsPdfDialogOpen(true)}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div className="bg-background rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>BPM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setlist.songs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-muted-foreground h-24 text-center"
                  >
                    This setlist has no songs yet.
                  </TableCell>
                </TableRow>
              ) : (
                setlist.songs.map((song, index) => (
                  <TableRow key={song.id}>
                    <TableCell className="text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{song.title}</span>
                        {song.tonality && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 font-mono text-[10px]"
                          >
                            {song.tonality}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{song.artist_name}</TableCell>
                    <TableCell>
                      {song.tempo ? (
                        <span className="text-muted-foreground font-mono text-sm">
                          {song.tempo}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Card className="text-muted-foreground flex flex-row items-center gap-2 px-4 py-3 text-sm">
          <ListMusic className="h-4 w-4 shrink-0" />
          <span>
            This is a read-only, public view of a setlist shared via Setlyst.
          </span>
        </Card>
      </div>

      <PublicExportPdfDialog
        setlistTitle={setlist.title}
        token={token}
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
      />
    </div>
  );
}
