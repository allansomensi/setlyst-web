"use client";

import { useState } from "react";
import { Guitar, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ChordDiagram } from "@/components/chords/chord-diagram";
import { InstrumentPicker } from "@/components/chords/chord-diagram-popover";
import { useChordDiagramPrefs } from "@/hooks/use-chord-diagram-prefs";

/** Chords shown in the preview, one per tap. */
const SAMPLES = ["C", "G7", "Am7", "F7M", "D/F#", "Bm7(b5)", "E7(9)"];

/**
 * Which instrument a tapped chord is drawn for, account-wide. The same
 * choice is offered in every diagram; this is where it's explained and
 * where left-handed fretboards are turned on.
 */
export function ChordDiagramsSection() {
  const t = useTranslations("settings.chordDiagrams");
  const [prefs, setPrefs] = useChordDiagramPrefs();
  const [sample, setSample] = useState(0);

  return (
    <Card id="chord-diagrams">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Guitar className="text-primary h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("instrument")}</p>
            <InstrumentPicker
              value={prefs.instrument}
              onChange={(instrument) => setPrefs({ instrument })}
              className="max-w-md"
            />
            <p className="text-muted-foreground text-xs">
              {t(`hints.${prefs.instrument}`)}
            </p>
          </div>
          <label className="hover:bg-muted/50 flex max-w-md cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors">
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {t("leftHanded")}
              </span>
              <span className="text-muted-foreground block text-xs">
                {t("leftHandedHint")}
              </span>
            </span>
            <Switch
              checked={prefs.leftHanded}
              onCheckedChange={(leftHanded) => setPrefs({ leftHanded })}
              disabled={prefs.instrument === "keyboard"}
            />
          </label>
        </div>
        <div className="bg-muted/30 flex flex-col items-center gap-1 rounded-xl border p-3">
          <div className="flex w-full items-center justify-between gap-2">
            <span className="font-mono text-lg font-bold">
              {SAMPLES[sample]}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSample((i) => (i + 1) % SAMPLES.length)}
              aria-label={t("nextSample")}
              title={t("nextSample")}
            >
              <Shuffle className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <ChordDiagram
            symbol={SAMPLES[sample]}
            instrument={prefs.instrument}
            leftHanded={prefs.leftHanded}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
