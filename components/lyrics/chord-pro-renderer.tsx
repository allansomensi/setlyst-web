"use client";

import { cn } from "@/lib/utils";
import React from "react";

// Token Types

type Token = { type: "chord"; value: string } | { type: "text"; value: string };

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

// Formatted Text Renderer

function renderFormattedText(text: string): React.ReactNode[] {
  // Support **bold**, *italic*, and __underline__
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <u key={i}>{part.slice(2, -2)}</u>;
    }
    return part || null;
  });
}

// Chord Line Renderer

function renderChordTokens(
  tokens: Token[],
  chordColor: string,
): React.ReactNode {
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
        <span key={i} className="inline-block">
          <span
            className={cn(
              "block font-mono leading-tight font-bold",
              chordColor,
            )}
            style={{ fontSize: "0.7em" }}
          >
            {pair.chord ?? "\u00A0"}
          </span>
          <span className="leading-relaxed">
            {renderFormattedText(pair.text) || "\u00A0"}
          </span>
        </span>
      ))}
    </span>
  );
}

// Section Label Component

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mt-6 mb-1 text-xs font-semibold tracking-widest uppercase">
      {children}
    </div>
  );
}

// Main Component

export interface ChordProRendererProps {
  content: string;
  showChords?: boolean;
  fontSize?: number; // in rem
  fontFamily?: "sans" | "mono" | "serif";
  chordColor?: string;
  className?: string;
}

export function ChordProRenderer({
  content,
  showChords = true,
  fontSize = 1,
  fontFamily = "sans",
  chordColor = "text-primary",
  className,
}: ChordProRendererProps) {
  if (!content?.trim()) {
    return (
      <div
        className="text-muted-foreground flex h-full items-center justify-center italic"
        style={{ fontSize: `${fontSize}rem` }}
      >
        No lyrics registered.
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line = spacing
    if (!trimmed) {
      elements.push(<div key={i} className="h-3" />);
      continue;
    }

    // Directives: {soc}, {eoc}, {sov:...}, {eov}, {comment:...}, {title:...}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const dir = parseDirective(trimmed);
      if (dir) {
        const { directive, value } = dir;

        if (directive === "soc" || directive === "start_of_chorus") {
          elements.push(<SectionLabel key={i}>— Chorus —</SectionLabel>);
          continue;
        }
        if (directive === "eoc" || directive === "end_of_chorus") {
          elements.push(<div key={i} className="mb-4" />);
          continue;
        }
        if (directive === "sov" || directive === "start_of_verse") {
          elements.push(
            <SectionLabel key={i}>— {value ?? "Verse"} —</SectionLabel>,
          );
          continue;
        }
        if (directive === "eov" || directive === "end_of_verse") {
          elements.push(<div key={i} className="mb-4" />);
          continue;
        }
        if (directive === "sob" || directive === "start_of_bridge") {
          elements.push(<SectionLabel key={i}>— Bridge —</SectionLabel>);
          continue;
        }
        if (directive === "eob" || directive === "end_of_bridge") {
          elements.push(<div key={i} className="mb-4" />);
          continue;
        }
        if (directive === "c" || directive === "comment") {
          elements.push(
            <div
              key={i}
              className="text-muted-foreground my-1 italic"
              style={{ fontSize: "0.75em" }}
            >
              {value}
            </div>,
          );
          continue;
        }
        if (directive === "title") {
          // skip title directive
          continue;
        }
        // Unknown directive: skip silently
        continue;
      }
    }

    // Comment lines
    if (trimmed.startsWith("#")) {
      elements.push(
        <div
          key={i}
          className="text-muted-foreground my-1 italic"
          style={{ fontSize: "0.75em" }}
        >
          {trimmed.slice(1).trim()}
        </div>,
      );
      continue;
    }

    // Lines with chords
    if (showChords && hasChords(line)) {
      const tokens = parseChordLine(line);
      elements.push(
        <div key={i} className="mb-1 leading-none">
          {renderChordTokens(tokens, chordColor)}
        </div>,
      );
      continue;
    }

    // Plain text line (strip chord markers when showChords is false)
    const textLine = showChords ? line : stripChords(line);
    elements.push(
      <div key={i} className="leading-relaxed">
        {renderFormattedText(textLine)}
      </div>,
    );
  }

  return (
    <div
      className={cn(fontClass, className)}
      style={{ fontSize: `${fontSize}rem` }}
    >
      {elements}
    </div>
  );
}
