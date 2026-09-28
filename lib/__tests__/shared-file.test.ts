import { describe, expect, it } from "vitest";
import { readSharedFile } from "@/lib/shared-file";

const artists = [{ id: "a", name: "Tom Jobim" }];
const songs = [
  { id: "s1", title: "Wave", artist_id: "a" },
  { id: "s2", title: "Garota de Ipanema", artist_id: "a" },
];
const setlist = {
  id: "l",
  title: "Bossa",
  songs: [
    { song_id: "s1", position: 1 },
    { song_id: "s2", position: 3 },
  ],
  markers: [{ marker_type: "block", label: "Abertura", position: 0 }],
};
const gig = (id: string, venue: string, tour_id: string | null = null) => ({
  id,
  venue,
  scheduled_at: "2030-01-10T21:00:00",
  status: "confirmed",
  setlist_id: "l",
  tour_id,
});

const file = (extra: Record<string, unknown>) =>
  JSON.stringify({
    version: 5,
    exported_at: "2026-09-28T12:00:00",
    artists,
    songs,
    setlists: [setlist],
    gigs: [],
    tours: [],
    ...extra,
  });

describe("readSharedFile", () => {
  it("summarises a setlist file", () => {
    expect(readSharedFile(file({ kind: "setlist" }))).toEqual({
      ok: true,
      summary: {
        kind: "setlist",
        title: "Bossa",
        songs: 2,
        artists: 1,
        setlists: 1,
        gigs: 0,
        markers: 1,
      },
    });
  });

  it("titles a gig file by its venue and a tour file by its name", () => {
    const gigFile = readSharedFile(
      file({ kind: "gig", gigs: [gig("g", "Blue Note")] }),
    );
    expect(gigFile).toMatchObject({
      ok: true,
      summary: { kind: "gig", title: "Blue Note", gigs: 1, setlists: 1 },
    });

    const tourFile = readSharedFile(
      file({
        kind: "tour",
        tours: [
          {
            id: "t",
            name: "Turnê de Verão",
            start_date: "2030-01-01",
            end_date: "2030-02-28",
          },
        ],
        gigs: [gig("g1", "Praia", "t"), gig("g2", "Serra", "t")],
      }),
    );
    expect(tourFile).toMatchObject({
      ok: true,
      summary: { kind: "tour", title: "Turnê de Verão", gigs: 2 },
    });
  });

  it("sends full backups to the backup settings", () => {
    expect(readSharedFile(file({ kind: "backup" }))).toEqual({
      ok: false,
      reason: "backup",
    });
    // Before format 5 files had no kind: always backups.
    expect(readSharedFile(file({ version: 4 }))).toEqual({
      ok: false,
      reason: "backup",
    });
  });

  it("refuses anything else", () => {
    for (const text of ["not json", "null", "[]", '{"version": 5}']) {
      expect(readSharedFile(text)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(readSharedFile(file({ kind: "song" }))).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(readSharedFile(file({ kind: "setlist", setlists: [] }))).toEqual({
      ok: false,
      reason: "invalid",
    });
    // A gig file without its gig.
    expect(readSharedFile(file({ kind: "gig" }))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
