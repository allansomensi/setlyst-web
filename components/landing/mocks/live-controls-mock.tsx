import { getTranslations } from "next-intl/server";
import { Contrast, Hand, Maximize2, Minus, Plus, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4.5 w-8 items-center rounded-full p-0.5 transition-colors",
        on ? "bg-primary justify-end" : "bg-muted-foreground/30 justify-start",
      )}
    >
      <span className="bg-background size-3.5 rounded-full shadow-sm" />
    </span>
  );
}

/**
 * Illustration of the Live Mode settings sheet: metronome with tap tempo,
 * transposition with the capo hint and display options. Decorative.
 */
export async function LiveControlsMock({ className }: { className?: string }) {
  const t = await getTranslations("landing.mock");

  return (
    <div
      aria-hidden
      className={cn(
        "bg-card overflow-hidden rounded-2xl border shadow-xl shadow-black/5 select-none dark:shadow-black/30",
        className,
      )}
    >
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{t("liveSettings")}</p>
      </div>
      <div className="grid gap-4 p-4 text-xs">
        <div>
          <p className="text-muted-foreground mb-2 font-semibold tracking-wide uppercase">
            {t("metronome")}
          </p>
          <div className="flex items-center gap-2">
            <span className="bg-muted flex size-8 items-center justify-center rounded-lg">
              <Minus className="size-3.5" />
            </span>
            <span className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-bold tabular-nums">
              <Timer className="text-primary size-4" />
              92 BPM
            </span>
            <span className="bg-muted flex size-8 items-center justify-center rounded-lg">
              <Plus className="size-3.5" />
            </span>
            <span className="bg-primary text-primary-foreground flex h-8 items-center gap-1 rounded-lg px-3 font-semibold">
              <Hand className="size-3.5" />
              Tap
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[0, 1, 2, 3].map((beat) => (
              <span
                key={beat}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  beat === 0 ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-2 font-semibold tracking-wide uppercase">
            {t("transposeTitle")}
          </p>
          <div className="flex items-center gap-2">
            <span className="bg-muted flex h-8 items-center rounded-lg px-3 font-mono font-semibold">
              G
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="bg-primary/10 text-primary flex h-8 items-center rounded-lg px-3 font-mono font-bold">
              A
            </span>
            <span className="text-muted-foreground ml-auto rounded-md border px-2 py-1">
              {t("capo")} 2
            </span>
          </div>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            {t("capoHint")}
          </p>
        </div>

        <div className="grid gap-2.5 border-t pt-4">
          <p className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Contrast className="text-muted-foreground size-4" />
              {t("highContrast")}
            </span>
            <Toggle on />
          </p>
          <p className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Maximize2 className="text-muted-foreground size-4" />
              {t("compact")}
            </span>
            <Toggle on={false} />
          </p>
        </div>
      </div>
    </div>
  );
}
