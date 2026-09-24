"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Accessible name of the search landmark; defaults to the placeholder. */
  label?: string;
  id?: string;
}

/**
 * A list's search box, as a `search` landmark with a labelled
 * `type="search"` field. The clear button keeps a small look but a
 * finger-sized hit area on touch screens, and puts focus back in the field.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  label,
  id,
}: SearchInputProps) {
  const t = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const text = placeholder ?? t("searchPlaceholder");

  return (
    <div
      role="search"
      aria-label={label ?? text}
      className={cn("relative", className)}
    >
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Escape clears, as in native search fields (which we restyle).
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={text}
        aria-label={label ?? text}
        enterKeyHint="search"
        autoComplete="off"
        // The native clear "×" is replaced by ours, which works everywhere.
        className="h-9 pr-9 pl-9 pointer-coarse:h-10 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md outline-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-3 pointer-fine:after:hidden"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label={t("clearSearch")}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
