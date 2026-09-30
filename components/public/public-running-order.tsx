"use client";

import { Coffee, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicSetlist } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";

type PublicSong = PublicSetlist["songs"][number];

type Entry =
  | { kind: "song"; song: PublicSong; number: number }
  | { kind: "block"; label: string | null; songs: number; seconds: number }
  | { kind: "break"; label: string | null; minutes: number | null };

/**
 * Songs and markers (blocks, breaks) in one running order. They share
 * one position space in the API; songs are numbered on their own, and
 * each block carries what it holds (songs up to the next block).
 */
function runningOrder(setlist: PublicSetlist): Entry[] {
  const items = [
    ...setlist.songs.map((song) => ({ position: song.position, song })),
    ...(setlist.markers ?? []).map((marker) => ({
      position: marker.position,
      marker,
    })),
  ].sort((a, b) => a.position - b.position);

  const entries: Entry[] = [];
  let number = 0;
  let block: Extract<Entry, { kind: "block" }> | null = null;
  for (const item of items) {
    if ("song" in item) {
      entries.push({ kind: "song", song: item.song, number: ++number });
      if (block) {
        block.songs += 1;
        block.seconds += item.song.duration ?? 0;
      }
    } else if (item.marker.marker_type === "block") {
      block = { kind: "block", label: item.marker.label, songs: 0, seconds: 0 };
      entries.push(block);
    } else {
      entries.push({
        kind: "break",
        label: item.marker.label,
        minutes: item.marker.duration_minutes,
      });
    }
  }
  return entries;
}

/**
 * The running order on the public share pages (/s and /g): the same
 * table as the dashboard's, read-only, blocks and breaks included.
 *
 * Both pages used to list the songs alone, so a shared show lost its
 * sets and its interval: a sound engineer reading "Set 2" in the band's
 * PDF found no "Set 2" on the link. The gig page also showed BPM only;
 * it now shows the durations like the setlist page.
 */
export function PublicRunningOrder({
  setlist,
  emptyText,
}: {
  setlist: PublicSetlist;
  /** Shown when the setlist has no songs yet. */
  emptyText: string;
}) {
  const tTable = useTranslations("setlists.songs.table");
  const t = useTranslations("setlists.songs");
  const entries = runningOrder(setlist);

  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-(--shadow-surface)">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>{tTable("title")}</TableHead>
            <TableHead className="hidden md:table-cell">
              {tTable("artist")}
            </TableHead>
            <TableHead className="text-right sm:text-left">
              {tTable("duration")}
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              {tTable("bpm")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {setlist.songs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground h-24 text-center"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry, index) => {
              if (entry.kind === "block") {
                return (
                  <TableRow
                    key={`block-${index}`}
                    className="bg-primary/5 hover:bg-primary/5"
                  >
                    <TableCell>
                      <Layers className="text-primary h-4 w-4" aria-hidden />
                    </TableCell>
                    <TableCell className="w-full max-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-primary max-w-[70%] shrink-0 truncate font-semibold tracking-wide uppercase">
                          {entry.label || t("blockLabel")}
                        </span>
                        <span className="text-muted-foreground min-w-0 truncate text-xs">
                          {t("blockSummary", { count: entry.songs })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell" />
                    <TableCell className="text-right sm:text-left">
                      {entry.seconds > 0 && (
                        <span className="text-primary/80 font-mono text-sm font-medium tabular-nums">
                          {formatDuration(entry.seconds)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" />
                  </TableRow>
                );
              }
              if (entry.kind === "break") {
                return (
                  <TableRow
                    key={`break-${index}`}
                    className="bg-muted/40 hover:bg-muted/40 border-y border-dashed"
                  >
                    <TableCell>
                      <Coffee
                        className="text-muted-foreground h-4 w-4"
                        aria-hidden
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground w-full max-w-0 truncate italic">
                      {entry.label || t("breakDefaultLabel")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" />
                    <TableCell className="text-right sm:text-left">
                      {!!entry.minutes && (
                        <span className="text-muted-foreground font-mono text-sm">
                          {t("breakMinutes", { count: entry.minutes })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" />
                  </TableRow>
                );
              }
              const { song } = entry;
              return (
                <TableRow key={`song-${song.position}-${index}`}>
                  <TableCell className="text-muted-foreground font-mono text-xs font-medium tabular-nums">
                    {String(entry.number).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="w-full max-w-0">
                    <div className="flex items-center gap-2">
                      {/* Full title on hover when it's cut short. */}
                      <span className="truncate font-medium" title={song.title}>
                        {song.title}
                      </span>
                      {song.tonality && (
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 px-1.5 font-mono text-[10px]"
                        >
                          {song.tonality}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs md:hidden">
                      {song.artist_name}
                      {song.tempo ? (
                        <span className="sm:hidden">
                          {/* Separator only between two things. */}
                          {song.artist_name ? " · " : null}
                          {song.tempo} {tTable("bpm")}
                        </span>
                      ) : null}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {song.artist_name}
                  </TableCell>
                  <TableCell className="text-right sm:text-left">
                    <span className="text-muted-foreground font-mono text-sm tabular-nums">
                      {song.duration ? formatDuration(song.duration) : "–"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-muted-foreground font-mono text-sm tabular-nums">
                      {song.tempo ?? "–"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
