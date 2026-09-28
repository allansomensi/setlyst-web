import { describe, expect, it } from "vitest";
import { readSetlistFile } from "@/lib/setlist-file";

const setlistFile = {
  version: 5,
  kind: "setlist",
  exported_at: "2026-09-28T12:00:00",
  artists: [{ id: "a", name: "Tom Jobim" }],
  songs: [
    { id: "s1", title: "Wave", artist_id: "a" },
    { id: "s2", title: "Garota de Ipanema", artist_id: "a" },
  ],
  setlists: [
    {
      id: "l",
      title: "Bossa",
      songs: [
        { song_id: "s1", position: 1 },
        { song_id: "s2", position: 3 },
      ],
      markers: [{ marker_type: "block", label: "Abertura", position: 0 }],
    },
  ],
  gigs: [],
  tours: [],
};

describe("readSetlistFile", () => {
  it("summarises a setlist file", () => {
    expect(readSetlistFile(JSON.stringify(setlistFile))).toEqual({
      ok: true,
      summary: { title: "Bossa", songs: 2, artists: 1, markers: 1 },
    });
  });

  it("sends full backups to the backup settings", () => {
    const backup = { ...setlistFile, kind: "backup" };
    expect(readSetlistFile(JSON.stringify(backup))).toEqual({
      ok: false,
      reason: "backup",
    });
    // Before format 5 files had no kind: always backups.
    const old = { ...setlistFile, version: 4, kind: undefined };
    expect(readSetlistFile(JSON.stringify(old))).toEqual({
      ok: false,
      reason: "backup",
    });
  });

  it("refuses anything else", () => {
    for (const text of ["not json", "null", "[]", '{"version": 5}']) {
      expect(readSetlistFile(text)).toEqual({ ok: false, reason: "invalid" });
    }
    const empty = { ...setlistFile, setlists: [] };
    expect(readSetlistFile(JSON.stringify(empty))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
