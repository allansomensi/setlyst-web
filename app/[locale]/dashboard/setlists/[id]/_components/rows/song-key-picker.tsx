"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toastActionError } from "@/lib/action-toast";
import { playedKey } from "@/lib/music/chords";
import { cn } from "@/lib/utils";
import { clampTranspose, MAX_TRANSPOSE } from "@/hooks/use-transpose";
import { setSetlistSongKey } from "../../../actions";

/** How long the key has to stay put before it is saved. */
const SAVE_DELAY_MS = 600;

function formatOffset(semitones: number): string {
  return semitones > 0 ? `+${semitones}` : String(semitones);
}

/**
 * The key a song is played in in this setlist — a badge on its row that,
 * for those who may edit the setlist, opens a small picker to move it up
 * or down (for a singer who takes it lower, say). The song itself and
 * other setlists keep their key.
 */
export function SongKeyPicker({
  setlistId,
  songId,
  title,
  tonality,
  transpose,
  editable,
}: {
  setlistId: string;
  songId: string;
  title: string;
  tonality: string | null | undefined;
  transpose: number;
  editable: boolean;
}) {
  const t = useTranslations("setlists.songs.key");
  // Shown at once; saved after a pause, so a few taps make one request.
  const [value, setValue] = useState(transpose);
  const [synced, setSynced] = useState(transpose);
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | null>(null);

  // The refreshed setlist is the source of truth once it arrives.
  if (synced !== transpose && !saving) {
    setSynced(transpose);
    setValue(transpose);
  }

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const change = (next: number) => {
    const semitones = clampTranspose(next);
    setValue(semitones);
    setSaving(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      timer.current = null;
      const result = await setSetlistSongKey(setlistId, songId, semitones);
      if (!result.success) {
        toastActionError(result, result.error);
        setValue(synced);
      }
      setSaving(false);
    }, SAVE_DELAY_MS);
  };

  const key = playedKey(tonality, value);
  const isTransposed = value !== 0;
  if (!key && !isTransposed && !editable) return null;

  const label = key ?? (isTransposed ? formatOffset(value) : t("set"));
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "h-5 shrink-0 gap-1 px-1.5 font-mono text-[10px]",
        isTransposed && "border-primary/40 text-primary",
        !key && !isTransposed && "text-muted-foreground font-sans",
      )}
      title={
        isTransposed && tonality
          ? t("playedIn", { key: label, written: tonality })
          : undefined
      }
    >
      {label}
      {isTransposed && key && (
        <span className="opacity-70">{formatOffset(value)}</span>
      )}
    </Badge>
  );

  if (!editable) return badge;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
          onClick={(e) => e.stopPropagation()}
          aria-label={t("change", { title })}
        >
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="text-muted-foreground text-xs">{t("description")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => change(value - 1)}
                disabled={value <= -MAX_TRANSPOSE}
                aria-label={t("down")}
                title={t("down")}
              >
                <Minus className="h-4 w-4" aria-hidden />
              </Button>
              <span
                className="flex w-16 flex-col items-center leading-none"
                aria-live="polite"
              >
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    isTransposed && "text-primary",
                  )}
                >
                  {key ?? (isTransposed ? formatOffset(value) : "—")}
                </span>
                <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                  {isTransposed ? formatOffset(value) : t("written")}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => change(value + 1)}
                disabled={value >= MAX_TRANSPOSE}
                aria-label={t("up")}
                title={t("up")}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => change(0)}
              disabled={!isTransposed}
              aria-label={t("reset")}
              title={t("reset")}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          {tonality && isTransposed && (
            <p className="text-muted-foreground text-xs">
              {t("writtenIn", { key: tonality })}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
