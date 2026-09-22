import { PublicGig, GigStatus } from "@/types/api";
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
import { CalendarDays, Clock, ListMusic, MapPin, Music } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface PublicGigViewProps {
  gig: PublicGig;
}

const STATUS_VARIANT: Record<
  GigStatus,
  "default" | "destructive" | "secondary"
> = {
  confirmed: "default",
  cancelled: "destructive",
  completed: "secondary",
};

const STATUS_LABEL: Record<GigStatus, string> = {
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

/**
 * A server component: this page renders once, has no interactive state,
 * and is opened by people without an account — so there's no reason to
 * ship it as client JavaScript.
 *
 * Its strings are hardcoded English for the same reason the setlist share
 * page's are: these routes sit outside the `[locale]` segment and so have
 * no next-intl context to translate against.
 */
export function PublicGigView({ gig }: PublicGigViewProps) {
  const scheduledAt = new Date(gig.scheduled_at);
  const isValidDate = !Number.isNaN(scheduledAt.getTime());

  const setlist = gig.setlist;

  return (
    <div className="bg-background flex min-h-screen flex-col items-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Music className="text-primary h-5 w-5" />
          <span className="text-muted-foreground text-sm font-medium">
            Setlyst
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{gig.venue}</h1>
            <Badge variant={STATUS_VARIANT[gig.status] ?? "secondary"}>
              {STATUS_LABEL[gig.status] ?? gig.status}
            </Badge>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {isValidDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="text-primary h-4 w-4" />
                <time dateTime={gig.scheduled_at}>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "full",
                    timeStyle: "short",
                  }).format(scheduledAt)}
                </time>
              </span>
            )}
            {gig.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="text-primary h-4 w-4" />
                {gig.location}
              </span>
            )}
          </div>
        </div>

        {setlist ? (
          <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold">{setlist.title}</h2>
                {setlist.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {setlist.description}
                  </p>
                )}
              </div>
              <div className="text-muted-foreground bg-muted/50 flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-medium">
                <Clock className="text-primary h-4 w-4" />
                <span>Total: {formatDuration(setlist.total_duration)}</span>
              </div>
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
          </div>
        ) : (
          <Card className="text-muted-foreground flex flex-row items-center gap-2 px-4 py-6 text-sm">
            <ListMusic className="h-4 w-4 shrink-0" />
            <span>No setlist has been linked to this gig yet.</span>
          </Card>
        )}

        <Card className="text-muted-foreground flex flex-row items-center gap-2 px-4 py-3 text-sm">
          <ListMusic className="h-4 w-4 shrink-0" />
          <span>
            This is a read-only, public view of a gig shared via Setlyst.
          </span>
        </Card>
      </div>
    </div>
  );
}
