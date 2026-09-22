"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AlignLeft,
  Guitar,
  ListEnd,
  MessageSquareText,
  Mic,
  MoveRight,
  Music,
  Play,
  Repeat,
  SquareArrowRightEnter,
  Timer,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANNOTATION_MARK,
  PILL_SECTIONS,
  parseChordPro,
  splitAnnotations,
  type Block,
  type SectionKey,
  type Word,
} from "@/lib/music/chordpro";

const ICONS: Partial<Record<SectionKey, LucideIcon>> = {
  intro: Play,
  verse: AlignLeft,
  preChorus: SquareArrowRightEnter,
  chorus: Mic,
  postChorus: Mic,
  hook: Mic,
  bridge: MoveRight,
  interlude: Music,
  instrumental: Music,
  solo: Guitar,
  guitarSolo: Guitar,
  keyboardSolo: Music,
  bassSolo: Guitar,
  drumSolo: Music,
  saxSolo: Music,
  synthSolo: Music,
  riff: Guitar,
  theme: Music,
  break: Timer,
  breakdown: Timer,
  fadeOut: Waves,
  outro: ListEnd,
  coda: ListEnd,
};

const FONT_CLASS = {
  sans: "font-sans",
  mono: "font-mono",
  serif: "font-serif",
} as const;

/** "(2x)", "x3" at the end of a lyric line: a repeat mark, not a lyric. */
const TRAILING_REPEAT =
  /\s*(\(\s*(?:x\s*\d+|\d+\s*x)\s*\)|\b(?:x\d+|\d+x))\s*$/i;

// Inline text

function renderFormatted(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return (
        <u key={key} className="underline underline-offset-4">
          {part.slice(2, -2)}
        </u>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part ? <React.Fragment key={key}>{part}</React.Fragment> : null;
  });
}

function Annotation({ children }: { children: React.ReactNode }) {
  return (
    <span
      data-annotation=""
      className="text-muted-foreground mx-[0.15em] align-baseline text-[0.7em] font-semibold tracking-wide italic"
    >
      {children}
    </span>
  );
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return splitAnnotations(text).flatMap((part, i): React.ReactNode[] => {
    const key = `${keyPrefix}-${i}`;
    if (part.type === "annotation") {
      return [<Annotation key={key}>{part.text}</Annotation>];
    }
    return renderFormatted(part.text, key);
  });
}

/** A lyric line as plain text, chords dropped and spacing tidied. */
function plainText(words: Word[]): string {
  return words
    .map((word) => word.map((segment) => segment.text).join(""))
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Pieces

function ChordLine({ words }: { words: Word[] }) {
  // A chord only needs breathing room after it when another chord follows
  // straight away — otherwise the padding just pushes the lyric apart.
  const flat = words.flat();
  let index = 0;

  return (
    <div data-line="" data-has-chords="" className="flex flex-wrap items-end">
      {words.map((word, w) => (
        // A word never wraps internally, even with a chord mid-word.
        <span key={w} className="inline-flex items-end">
          {word.map((segment, s) => {
            const next = flat[++index];
            const lyric = (
              <span data-lyric="" className="leading-[1.35] whitespace-pre">
                {segment.text
                  ? renderInline(segment.text, `${w}-${s}`)
                  : "\u00A0"}
              </span>
            );
            // Chordless pieces carry no empty chord row: aligned to the
            // bottom, they sit on the same baseline anyway, and a wrapped
            // line with no chords on it doesn't reserve space for them.
            if (segment.chord === null) {
              return <React.Fragment key={s}>{lyric}</React.Fragment>;
            }
            // Padding on the chord only widens the segment when the chord is
            // wider than its syllable, which is exactly when it's needed.
            const crowded = next?.chord != null;
            return (
              <span key={s} className="inline-flex flex-col">
                <span
                  data-chord=""
                  className={cn(
                    "text-primary font-mono text-[0.72em] leading-[1.35] font-bold tracking-tight",
                    crowded ? "pr-[0.6em]" : "pr-[0.15em]",
                  )}
                >
                  {segment.chord}
                </span>
                {lyric}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

function TextLine({ text }: { text: string }) {
  const repeat = TRAILING_REPEAT.exec(text);
  const body = repeat ? text.slice(0, repeat.index) : text;
  return (
    <div data-line="" data-lyric="" className="leading-[1.45]">
      {renderInline(body, "t")}
      {repeat && <Annotation>{repeat[1]}</Annotation>}
    </div>
  );
}

function ChordsRow({
  items,
}: {
  items: Array<{ chord: boolean; text: string }>;
}) {
  return (
    <div
      data-line=""
      data-chord-line=""
      className="flex flex-wrap items-baseline gap-x-[0.9em] gap-y-[0.2em] py-[0.1em]"
    >
      {items.map((item, i) =>
        item.chord ? (
          <span
            key={i}
            data-chord=""
            className="text-primary font-mono text-[0.8em] font-bold tracking-tight"
          >
            {item.text}
          </span>
        ) : (
          <span
            key={i}
            className="text-muted-foreground font-mono text-[0.7em]"
          >
            {item.text}
          </span>
        ),
      )}
    </div>
  );
}

function SectionHeading({
  label,
  icon: Icon,
  pill,
  repeat,
}: {
  label: string;
  icon?: LucideIcon;
  pill: boolean;
  repeat: number | null;
}) {
  const repeatBadge = repeat && repeat > 1 && (
    <span className="bg-muted text-foreground rounded-[0.4em] px-[0.5em] py-[0.1em] font-mono text-[0.95em] tracking-normal normal-case">
      ×{repeat}
    </span>
  );

  if (pill) {
    return (
      <div data-section-label="" className="mt-[1.4em] mb-[0.6em] first:mt-0">
        <div className="text-muted-foreground bg-muted/40 inline-flex items-center gap-[0.5em] rounded-full border px-[1em] py-[0.35em] text-[0.62em] font-bold tracking-[0.14em] uppercase">
          {Icon && <Icon className="size-[1.25em]" strokeWidth={2.5} />}
          <span>{label}</span>
          {repeatBadge}
        </div>
      </div>
    );
  }

  return (
    <div
      data-section-label=""
      className="text-muted-foreground border-border/60 mt-[1.6em] mb-[0.6em] flex items-center gap-[0.5em] border-b pb-[0.35em] text-[0.62em] font-bold tracking-[0.14em] uppercase first:mt-0"
    >
      {Icon && <Icon className="size-[1.25em]" strokeWidth={2.5} />}
      <span>{label}</span>
      {repeatBadge}
    </div>
  );
}

// Main component

export interface ChordProRendererProps {
  content: string;
  /** Chords above the lyrics (and chord-only lines, tabs, capo). */
  showChords?: boolean;
  /** Section headings (Verse, Chorus…) and the chorus accent. */
  showSections?: boolean;
  /**
   * In rem — or "inherit" to take the size from the surrounding element,
   * which Live Mode's compact layout uses to size the text itself.
   */
  fontSize?: number | "inherit";
  fontFamily?: "sans" | "mono" | "serif";
  className?: string;
}

type Item =
  | { kind: "gap" }
  | { kind: "heading"; node: React.ReactNode }
  | { kind: "content"; node: React.ReactNode; chorus: boolean };

/**
 * Renders ChordPro lyrics — see lib/music/chordpro.ts for what's parsed.
 *
 * Everything is sized in `em`, relative to the chosen text size, so the
 * spacing scales with it — including in Live Mode's compact layout, which
 * shrinks the text to fit the screen and would otherwise be left with
 * gaps as large as the lyrics.
 *
 * Vertical space is decided here rather than copied from the source:
 * runs of blank lines collapse to one gap, and no gap is drawn at the top,
 * at the bottom, or next to a section heading (which has its own spacing).
 * Hiding chords can't leave holes where chord-only lines used to be.
 */
export function ChordProRenderer({
  content,
  showChords = true,
  showSections = true,
  fontSize = 1.1,
  fontFamily = "sans",
  className,
}: ChordProRendererProps) {
  const t = useTranslations("lyrics");
  const tSection = useTranslations("lyrics.toolbar");

  const blocks = useMemo<Block[]>(
    () => (content?.trim() ? parseChordPro(content) : []),
    [content],
  );

  const cssFontSize = fontSize === "inherit" ? "1em" : `${fontSize}rem`;

  if (blocks.length === 0) {
    return (
      <div
        className="text-muted-foreground flex h-full items-center justify-center italic"
        style={{ fontSize: cssFontSize }}
      >
        {t("noLyrics")}
      </div>
    );
  }

  const headingLabel = (block: Extract<Block, { type: "heading" }>) => {
    if (!block.key) return block.raw.replace(ANNOTATION_MARK, "");
    const parts = [tSection(block.key)];
    if (block.heading?.number) parts.push(block.heading.number);
    let label = parts.join(" ");
    if (block.heading?.extra) label += ` · ${block.heading.extra}`;
    return label;
  };

  // 1. Blocks → items, honouring what's shown.
  const items: Item[] = [];
  blocks.forEach((block, i) => {
    switch (block.type) {
      case "blank":
        items.push({ kind: "gap" });
        return;
      case "heading":
        if (!showSections) {
          items.push({ kind: "gap" });
          return;
        }
        if (!block.key && !block.raw) return;
        items.push({
          kind: "heading",
          node: (
            <SectionHeading
              key={i}
              label={headingLabel(block)}
              icon={block.key ? ICONS[block.key] : undefined}
              pill={block.key ? PILL_SECTIONS.has(block.key) : false}
              repeat={block.heading?.repeat ?? null}
            />
          ),
        });
        return;
      case "lyric": {
        if (showChords && block.hasChords) {
          items.push({
            kind: "content",
            chorus: block.chorus,
            node: <ChordLine key={i} words={block.words} />,
          });
          return;
        }
        const text = plainText(block.words);
        if (!text.replace(new RegExp(ANNOTATION_MARK, "g"), "").trim()) return;
        items.push({
          kind: "content",
          chorus: block.chorus,
          node: <TextLine key={i} text={text} />,
        });
        return;
      }
      case "chords":
        if (!showChords) return;
        items.push({
          kind: "content",
          chorus: block.chorus,
          node: <ChordsRow key={i} items={block.items} />,
        });
        return;
      case "tab":
        if (!showChords) return;
        items.push({
          kind: "content",
          chorus: false,
          node: (
            <pre
              key={i}
              data-line=""
              data-tab=""
              className="bg-muted/40 text-foreground my-[0.4em] overflow-x-auto rounded-[0.5em] px-[0.8em] py-[0.5em] font-mono text-[0.68em] leading-[1.35]"
            >
              {block.lines.join("\n")}
            </pre>
          ),
        });
        return;
      case "capo":
        if (!showChords) return;
        items.push({
          kind: "content",
          chorus: false,
          node: (
            <div key={i} data-line="" className="my-[0.3em]">
              <span className="border-primary/40 text-primary inline-flex items-center rounded-full border px-[0.8em] py-[0.15em] text-[0.62em] font-bold tracking-[0.12em] uppercase">
                {t("render.capo", { fret: block.fret })}
              </span>
            </div>
          ),
        });
        return;
      case "chorusRepeat":
        items.push({
          kind: "heading",
          node: (
            <SectionHeading
              key={i}
              label={
                block.label
                  ? `${tSection("chorus")} · ${block.label}`
                  : t("render.repeatChorus")
              }
              icon={Repeat}
              pill
              repeat={null}
            />
          ),
        });
        return;
      case "comment":
        items.push({
          kind: "content",
          chorus: false,
          node: (
            <div
              key={i}
              data-line=""
              data-comment=""
              className={cn(
                "text-muted-foreground my-[0.3em] flex items-start gap-[0.4em] text-[0.75em]",
                block.style === "italic" && "italic",
                block.style === "box" &&
                  "w-fit rounded-[0.4em] border px-[0.6em] py-[0.2em]",
              )}
            >
              <MessageSquareText className="mt-[0.2em] size-[1em] shrink-0 opacity-70" />
              <span>{renderInline(block.text, `c${i}`)}</span>
            </div>
          ),
        });
        return;
    }
  });

  // 2. Collapse gaps: none at the edges, none next to a heading, never two
  //    in a row.
  const tidy: Item[] = [];
  for (const item of items) {
    const prev = tidy[tidy.length - 1];
    if (item.kind === "gap") {
      if (!prev || prev.kind === "gap" || prev.kind === "heading") continue;
    } else if (item.kind === "heading" && prev?.kind === "gap") {
      tidy.pop();
    }
    tidy.push(item);
  }
  while (tidy.length && tidy[tidy.length - 1].kind === "gap") tidy.pop();

  // 3. Group consecutive chorus lines under one accent bar.
  const output: React.ReactNode[] = [];
  let chorusGroup: React.ReactNode[] = [];
  const flushChorus = () => {
    if (!chorusGroup.length) return;
    output.push(
      <div
        key={`chorus-${output.length}`}
        data-chorus=""
        className="border-primary/35 border-l-[0.15em] pl-[0.8em]"
      >
        {chorusGroup}
      </div>,
    );
    chorusGroup = [];
  };

  tidy.forEach((item, index) => {
    const node =
      item.kind === "gap" ? (
        <div key={`gap-${index}`} data-blank="" className="h-[0.8em]" />
      ) : (
        item.node
      );

    const isChorusLine = showSections && item.kind === "content" && item.chorus;
    // A gap between two chorus stanzas stays inside the bar.
    const continuesChorus =
      showSections &&
      item.kind === "gap" &&
      chorusGroup.length > 0 &&
      tidy[index + 1]?.kind === "content" &&
      (tidy[index + 1] as Extract<Item, { kind: "content" }>).chorus;

    if (isChorusLine || continuesChorus) {
      chorusGroup.push(node);
    } else {
      flushChorus();
      output.push(node);
    }
  });
  flushChorus();

  return (
    <div
      data-chordpro=""
      className={cn(
        FONT_CLASS[fontFamily],
        "text-foreground max-w-3xl font-medium [overflow-wrap:anywhere]",
        className,
      )}
      style={{ fontSize: cssFontSize }}
    >
      {output}
    </div>
  );
}
