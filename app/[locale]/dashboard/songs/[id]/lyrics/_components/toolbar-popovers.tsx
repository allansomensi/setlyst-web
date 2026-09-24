"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const COMMON_CHORDS = [
  "C",
  "Cm",
  "C7",
  "Cmaj7",
  "D",
  "Dm",
  "D7",
  "Dmaj7",
  "E",
  "Em",
  "E7",
  "F",
  "Fm",
  "F7",
  "Fmaj7",
  "G",
  "Gm",
  "G7",
  "Gmaj7",
  "A",
  "Am",
  "A7",
  "Amaj7",
  "B",
  "Bm",
  "B7",
  "Bb",
  "Bbm",
  "Bb7",
  "Eb",
  "Ebm",
  "Ab",
  "Abm",
];

interface ChordPopoverProps {
  onInsert: (chord: string) => void;
}

export function ChordPopover({ onInsert }: ChordPopoverProps) {
  const t = useTranslations("lyrics.toolbar");
  const [custom, setCustom] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          title={t("insertChord")}
        >
          <Music className="h-3.5 w-3.5" />
          {t("chord")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("customChord")}</Label>
            <div className="flex gap-2">
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={t("customChordPlaceholder")}
                className="h-8 text-base md:text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim()) {
                    onInsert(custom.trim());
                    setCustom("");
                    setOpen(false);
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8"
                disabled={!custom.trim()}
                onClick={() => {
                  onInsert(custom.trim());
                  setCustom("");
                  setOpen(false);
                }}
              >
                {t("insertAction")}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              {t("commonChords")}
            </Label>
            <div className="flex flex-wrap gap-1">
              {COMMON_CHORDS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onInsert(c);
                    setOpen(false);
                  }}
                  className="bg-muted hover:bg-accent hover:text-accent-foreground rounded px-2 py-0.5 font-mono text-xs transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HelpPopover() {
  const t = useTranslations("lyrics.help");
  const rows: Array<[string, string]> = [
    ["[Am]Hello [G]world", t("inlineChords")],
    ["[Refrão]  /  Pré-Refrão:", t("sections")],
    ["{soc} … {eoc}", t("environments")],
    ["{c: …}", t("comment")],
    ["**b**  *i*  __u__", t("formatting")],
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t("title")}
          aria-label={t("title")}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[22rem] max-w-[calc(100vw-2rem)] p-4"
        align="end"
      >
        <h4 className="mb-1 font-semibold">{t("title")}</h4>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          {t("intro")}
        </p>
        <dl className="space-y-2.5">
          {rows.map(([code, description]) => (
            <div key={code} className="space-y-1">
              <dt className="bg-muted w-fit rounded px-1.5 py-0.5 font-mono text-xs">
                {code}
              </dt>
              <dd className="text-muted-foreground text-xs leading-snug">
                {description}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-3 border-t pt-3 text-xs leading-relaxed">
          {t("pasteTip")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
