"use client";

import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  MAX_TAGS_PER_SONG,
  MAX_TAG_LENGTH,
  normalizeTag,
  tagIssue,
} from "@/lib/tags";
import { TagChip } from "./tag-chip";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** The account's existing tags, offered as suggestions. */
  suggestions?: string[];
  id?: string;
  disabled?: boolean;
}

/**
 * Chips + free text. Enter, comma or Tab adds the typed tag; Backspace on
 * an empty field removes the last one. Suggestions come from tags already
 * in use, so the vocabulary stays consistent ("balada" vs "ballad").
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  id,
  disabled,
}: TagInputProps) {
  const t = useTranslations("tags");
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-suggestions`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const full = value.length >= MAX_TAGS_PER_SONG;
  const normalizedDraft = normalizeTag(draft);
  const issue = normalizedDraft ? tagIssue(normalizedDraft) : null;

  const query = normalizedDraft ?? "";
  const matches = suggestions
    .filter((s) => !value.includes(s) && (!query || s.includes(query)))
    .slice(0, 8);

  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || tagIssue(tag) || value.includes(tag) || full) return false;
    onChange([...value, tag]);
    setDraft("");
    setHighlight(-1);
    return true;
  };

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const showingList = focused && matches.length > 0;
    if (event.key === "ArrowDown" && showingList) {
      event.preventDefault();
      setHighlight((h) => (h === -1 ? 0 : (h + 1) % matches.length));
    } else if (event.key === "ArrowUp" && showingList) {
      event.preventDefault();
      setHighlight((h) => (h <= 0 ? matches.length - 1 : h - 1));
    } else if (event.key === "Enter" || event.key === ",") {
      // Never submit the surrounding form from inside the tag field.
      if (event.key === "," || draft.trim() || highlight >= 0) {
        event.preventDefault();
      }
      if (event.key === "Enter" && showingList && highlight >= 0) {
        add(matches[highlight]);
      } else if (draft.trim()) {
        add(draft);
      }
    } else if (event.key === "Tab" && draft.trim()) {
      if (add(draft)) event.preventDefault();
    } else if (event.key === "Backspace" && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    } else if (event.key === "Escape") {
      setFocused(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1 shadow-xs focus-within:ring-[3px]",
          disabled && "pointer-events-none opacity-50",
          issue && "border-destructive",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <TagChip key={tag} tag={tag}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(tag);
              }}
              className="hover:bg-foreground/10 -mr-1 ml-0.5 rounded-full p-0.5"
              aria-label={t("remove", { tag })}
            >
              <X className="h-3 w-3" />
            </button>
          </TagChip>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.slice(0, MAX_TAG_LENGTH + 5));
            setHighlight(-1);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Keep a typed-but-not-confirmed tag instead of silently losing it.
            if (draft.trim()) add(draft);
            setTimeout(() => setFocused(false), 120);
          }}
          disabled={disabled || full}
          placeholder={
            full
              ? t("full", { max: MAX_TAGS_PER_SONG })
              : value.length
                ? ""
                : t("placeholder")
          }
          className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
          role="combobox"
          aria-expanded={focused && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>

      {focused && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="flex flex-wrap gap-1"
          aria-label={t("suggestions")}
        >
          {matches.map((tag, index) => (
            <li key={tag} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(tag)}
                className={cn(
                  "rounded-full transition-opacity hover:opacity-80",
                  index === highlight && "ring-ring ring-2",
                )}
              >
                <TagChip tag={tag} className="bg-muted text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        className={cn(
          "text-xs",
          issue ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {issue
          ? t(`issues.${issue}`, { max: MAX_TAG_LENGTH })
          : t("hint", { count: value.length, max: MAX_TAGS_PER_SONG })}
      </p>
    </div>
  );
}
