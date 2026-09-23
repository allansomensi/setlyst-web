import { useTranslations } from "next-intl";
import {
  Bug,
  CircleDot,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { pickLocalized } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { ReleaseItemKind, ReleaseNote } from "@/types/public";
import { formatApiDay } from "@/lib/dates";

const KIND_ICONS: Record<ReleaseItemKind, LucideIcon> = {
  new: Sparkles,
  improved: Wand2,
  fixed: Bug,
  security: ShieldCheck,
};

const KIND_STYLES: Record<ReleaseItemKind, string> = {
  new: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  improved:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  fixed:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  security:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function isKnownKind(kind: string): kind is ReleaseItemKind {
  return kind in KIND_ICONS;
}

export interface ReleaseNotesListProps {
  /** Published notes, newest first (`GET /public/release-notes`). */
  notes: ReleaseNote[];
  /** Locale for the texts (falls back to English per field) and dates. */
  locale: string;
  /** Heading level of each release title (default `h2`). */
  headingLevel?: "h2" | "h3";
  /** Marks the first release as the latest one (default `true`). */
  highlightLatest?: boolean;
  className?: string;
}

/**
 * The release notes timeline, shared by the public changelog and the
 * signed-in "Novidades" page (and the staff editor's preview, which is why
 * it uses `useTranslations`: it renders on the server and in the client).
 * Pure rendering: callers fetch the notes
 * (e.g. with `getPublicReleaseNotes()` from lib/public-api.ts) and handle
 * the API-down case; an empty list renders an empty state.
 */
export function ReleaseNotesList({
  notes,
  locale,
  headingLevel = "h2",
  highlightLatest = true,
  className,
}: ReleaseNotesListProps) {
  const t = useTranslations("releaseNotes");
  const Heading = headingLevel;

  if (notes.length === 0) {
    return (
      <div
        className={cn(
          "bg-card text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center",
          className,
        )}
      >
        <Megaphone className="size-8 opacity-60" />
        <p>{t("empty")}</p>
      </div>
    );
  }

  return (
    <ol className={cn("relative space-y-8", className)}>
      {notes.map((note, index) => {
        const latest = highlightLatest && index === 0;
        const released = formatApiDay(note.released_on, locale) || null;
        const edited = note.is_edited
          ? formatApiDay(note.updated_at, locale) || null
          : null;
        const title = pickLocalized(note.title, locale);

        return (
          <li
            key={note.id}
            className="grid gap-4 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-8"
          >
            <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:pt-6">
              <Badge
                variant={latest ? "default" : "secondary"}
                className="h-6 px-2.5 font-mono text-xs"
              >
                v{note.version}
              </Badge>
              {latest && (
                <Badge variant="outline" className="h-6 px-2.5">
                  {t("latest")}
                </Badge>
              )}
            </div>

            <article
              aria-labelledby={`release-${note.id}`}
              className={cn(
                "bg-card rounded-2xl border p-6 shadow-xs sm:p-7",
                latest && "ring-primary/20 ring-4",
              )}
            >
              <header className="space-y-2">
                <Heading
                  id={`release-${note.id}`}
                  className="text-xl font-semibold tracking-tight text-balance"
                >
                  {title || t("version", { version: note.version })}
                </Heading>
                <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {released && (
                    <time dateTime={note.released_on}>
                      {t("released", { date: released })}
                    </time>
                  )}
                  {edited && (
                    <time dateTime={note.updated_at}>
                      {t("edited", { date: edited })}
                    </time>
                  )}
                </p>
              </header>

              <ul className="mt-5 space-y-3.5">
                {note.items.map((item, itemIndex) => {
                  const kind = isKnownKind(item.kind) ? item.kind : null;
                  const Icon = kind ? KIND_ICONS[kind] : CircleDot;
                  return (
                    <li
                      key={itemIndex}
                      className="flex flex-col gap-1.5 sm:flex-row sm:gap-3"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-0.5 h-6 w-28 shrink-0 justify-start px-2",
                          kind && KIND_STYLES[kind],
                        )}
                      >
                        <Icon />
                        {kind ? t(`kinds.${kind}`) : item.kind}
                      </Badge>
                      <p className="text-sm leading-relaxed">
                        {pickLocalized(item.text, locale)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
