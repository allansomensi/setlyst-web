"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { useTranslations } from "next-intl";
import {
  Mic,
  Music,
  AlignLeft,
  Play,
  ListEnd,
  MoveRight,
  Timer,
  SquareArrowRightEnter,
} from "lucide-react";

// Token Types
type Token = { type: "chord"; value: string } | { type: "text"; value: string };

type ToolbarKey =
  | "intro"
  | "verse"
  | "chorus"
  | "preChorus"
  | "postChorus"
  | "bridge"
  | "interlude"
  | "instrumental"
  | "solo"
  | "guitarSolo"
  | "keyboardSolo"
  | "bassSolo"
  | "drumSolo"
  | "saxSolo"
  | "synthSolo"
  | "break"
  | "breakdown"
  | "drop"
  | "vamp"
  | "tag"
  | "hook"
  | "turnaround"
  | "buildUp"
  | "theme"
  | "outro"
  | "coda";

const SECTION_MAP: Record<string, ToolbarKey> = {
  intro: "intro",
  introduction: "intro",
  outro: "outro",
  ending: "outro",
  coda: "coda",
  finale: "outro",
  verse: "verse",
  chorus: "chorus",
  refrain: "chorus",
  "pre-chorus": "preChorus",
  "pre chorus": "preChorus",
  prechorus: "preChorus",
  "post-chorus": "postChorus",
  "post chorus": "postChorus",
  postchorus: "postChorus",
  bridge: "bridge",
  interlude: "interlude",
  instrumental: "instrumental",
  solo: "solo",
  "guitar solo": "guitarSolo",
  "keyboard solo": "keyboardSolo",
  "piano solo": "keyboardSolo",
  "bass solo": "bassSolo",
  "drum solo": "drumSolo",
  "sax solo": "saxSolo",
  "synth solo": "synthSolo",
  break: "break",
  breakdown: "breakdown",
  drop: "drop",
  vamp: "vamp",
  tag: "tag",
  hook: "hook",
  turnaround: "turnaround",
  build: "buildUp",
  "build up": "buildUp",
  "build-up": "buildUp",
  theme: "theme",
};

const PILL_SECTIONS = new Set<ToolbarKey>([
  "interlude",
  "instrumental",
  "solo",
  "guitarSolo",
  "keyboardSolo",
  "bassSolo",
  "drumSolo",
  "saxSolo",
  "synthSolo",
  "break",
  "breakdown",
  "drop",
  "turnaround",
]);

const ICON_MAP: Partial<Record<ToolbarKey, React.ElementType>> = {
  intro: Play,
  outro: ListEnd,
  verse: AlignLeft,
  chorus: Mic,
  preChorus: SquareArrowRightEnter,
  bridge: MoveRight,
  solo: Music,
  guitarSolo: Music,
  keyboardSolo: Music,
  bassSolo: Music,
  drumSolo: Music,
  saxSolo: Music,
  synthSolo: Music,
  instrumental: Music,
  break: Timer,
  breakdown: Timer,
  coda: ListEnd,
};

// Parsers
function parseChordLine(line: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "chord", value: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: "text", value: line.slice(lastIndex) });
  }

  return tokens;
}

function hasChords(line: string): boolean {
  return /\[[^\]]+\]/.test(line);
}

function stripChords(line: string): string {
  return line.replace(/\[[^\]]+\]/g, "");
}

function parseDirective(
  line: string,
): { directive: string; value?: string } | null {
  const match = line.match(/^\{([^:}]+)(?::([^}]*))?\}$/);
  if (!match) return null;
  return {
    directive: match[1].trim().toLowerCase(),
    value: match[2]?.trim(),
  };
}

function renderFormattedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic opacity-90">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <u
          key={i}
          className="decoration-muted-foreground underline underline-offset-4"
        >
          {part.slice(2, -2)}
        </u>
      );
    }
    return part || null;
  });
}

function renderChordTokens(tokens: Token[]): React.ReactNode {
  const pairs: Array<{ chord?: string; text: string }> = [];
  let current: { chord?: string; text: string } = { text: "" };

  for (const token of tokens) {
    if (token.type === "chord") {
      if (current.chord !== undefined || current.text) {
        pairs.push(current);
      }
      current = { chord: token.value, text: "" };
    } else {
      current.text += token.value;
    }
  }
  if (current.chord !== undefined || current.text) pairs.push(current);

  return (
    <span className="inline-flex flex-wrap">
      {pairs.map((pair, i) => (
        <span key={i} className="relative inline-block">
          <span
            className="text-muted-foreground/60 block font-mono font-semibold tracking-tighter"
            style={{ fontSize: "0.65em", marginBottom: "-0.2em" }}
          >
            {pair.chord ?? "\u00A0"}
          </span>
          <span className="text-foreground leading-relaxed font-medium whitespace-pre-wrap">
            {renderFormattedText(pair.text) || "\u00A0"}
          </span>
        </span>
      ))}
    </span>
  );
}

function SectionLabel({
  children,
  icon: Icon,
  variant = "block",
}: {
  children: React.ReactNode;
  icon?: React.ElementType;
  variant?: "block" | "pill";
}) {
  if (variant === "pill") {
    return (
      <div className="my-5 flex items-center">
        <div className="border-border bg-muted/10 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest uppercase shadow-sm">
          {Icon && <Icon className="h-4 w-4 opacity-80" strokeWidth={2.5} />}
          <span>{children}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/50 text-muted-foreground mt-8 mb-3 flex items-center gap-2 border-b pb-1 text-xs font-bold tracking-widest uppercase">
      {Icon && <Icon className="h-4 w-4" strokeWidth={2.5} />}
      <span>{children}</span>
    </div>
  );
}

// Main Component
export interface ChordProRendererProps {
  content: string;
  showChords?: boolean;
  fontSize?: number; // in rem
  fontFamily?: "sans" | "mono" | "serif";
  className?: string;
}

export function ChordProRenderer({
  content,
  showChords = true,
  fontSize = 1.1,
  fontFamily = "sans",
  className,
}: ChordProRendererProps) {
  const t = useTranslations("lyrics");
  const tToolbar = useTranslations("lyrics.toolbar");

  const resolveLabel = (defaultKey: ToolbarKey, providedValue?: string) => {
    if (!providedValue) return tToolbar(defaultKey);

    const trimmed = providedValue.trim();

    if (/^\d+$/.test(trimmed)) {
      return `${tToolbar(defaultKey)} ${trimmed}`;
    }

    let normalized = trimmed.toLowerCase();
    let suffix = "";
    const match = normalized.match(/^(.*?)\s*(\d+)$/);

    if (match) {
      normalized = match[1].trim();
      suffix = ` ${match[2]}`;
    }

    const mappedKey = SECTION_MAP[normalized];
    if (mappedKey) {
      return `${tToolbar(mappedKey)}${suffix}`;
    }

    return trimmed;
  };

  if (!content?.trim()) {
    return (
      <div
        className="text-muted-foreground flex h-full items-center justify-center italic"
        style={{ fontSize: `${fontSize}rem` }}
      >
        {t("noLyrics")}
      </div>
    );
  }

  const fontClass = {
    sans: "font-sans",
    mono: "font-mono",
    serif: "font-serif",
  }[fontFamily];

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inChorus = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(
        <div
          key={i}
          className={cn(
            "h-4",
            inChorus && "border-foreground/20 bg-muted/10 border-l-2",
          )}
        />,
      );
      continue;
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const dir = parseDirective(trimmed);
      if (dir) {
        const { directive, value } = dir;

        if (directive === "soc" || directive === "start_of_chorus") {
          inChorus = true;
          elements.push(
            <SectionLabel key={i} icon={ICON_MAP["chorus"]}>
              {resolveLabel("chorus", value)}
            </SectionLabel>,
          );
          continue;
        }

        if (directive === "eoc" || directive === "end_of_chorus") {
          inChorus = false;
          continue;
        }

        if (directive === "sov" || directive === "start_of_verse") {
          elements.push(
            <SectionLabel key={i} icon={ICON_MAP["verse"]}>
              {resolveLabel("verse", value)}
            </SectionLabel>,
          );
          continue;
        }

        if (directive === "eov" || directive === "end_of_verse") {
          continue;
        }

        if (directive === "sob" || directive === "start_of_bridge") {
          elements.push(
            <SectionLabel key={i} icon={ICON_MAP["bridge"]}>
              {resolveLabel("bridge", value)}
            </SectionLabel>,
          );
          continue;
        }

        if (directive === "eob" || directive === "end_of_bridge") {
          continue;
        }

        if (directive === "c" || directive === "comment") {
          let normalizedValue = value?.trim().toLowerCase() || "";
          let suffix = "";

          const numberMatch = normalizedValue.match(/^(.*?)\s*(\d+)$/);
          if (numberMatch) {
            normalizedValue = numberMatch[1].trim();
            suffix = ` ${numberMatch[2]}`;
          }

          const translationKey = SECTION_MAP[normalizedValue];

          if (translationKey) {
            const variant = PILL_SECTIONS.has(translationKey)
              ? "pill"
              : "block";

            elements.push(
              <SectionLabel
                key={i}
                icon={ICON_MAP[translationKey]}
                variant={variant}
              >
                {tToolbar(translationKey)}
                {suffix}
              </SectionLabel>,
            );
          } else {
            elements.push(
              <div
                key={i}
                className="text-muted-foreground my-2 font-mono text-xs tracking-wider uppercase"
              >
                [{value}]
              </div>,
            );
          }
          continue;
        }

        if (directive === "title") continue;
        continue;
      }
    }

    if (trimmed.startsWith("#")) {
      continue;
    }

    const lineWrapperClass = cn(
      "mb-1.5",
      inChorus &&
        "border-foreground/20 bg-muted/10 border-l-2 py-0.5 pl-4 transition-colors",
    );

    if (showChords && hasChords(line)) {
      const tokens = parseChordLine(line);
      elements.push(
        <div key={i} className={lineWrapperClass}>
          {renderChordTokens(tokens)}
        </div>,
      );
      continue;
    }

    const textLine = showChords ? line : stripChords(line);
    elements.push(
      <div
        key={i}
        className={cn(lineWrapperClass, "text-foreground font-medium")}
      >
        {renderFormattedText(textLine)}
      </div>,
    );
  }

  return (
    <div
      className={cn(fontClass, className, "max-w-3xl")}
      style={{ fontSize: `${fontSize}rem` }}
    >
      {elements}
    </div>
  );
}
