"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickerOption {
  id: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface EntityPickerProps {
  /** Runs a server-side search; called debounced as the person types. */
  search: (query: string) => Promise<PickerOption[]>;
  value: string | null;
  onChange: (option: PickerOption | null) => void;
  placeholder: string;
  autoFocus?: boolean;
}

const DEBOUNCE_MS = 250;

/**
 * A small search-and-pick list for choosing one band or one user among
 * possibly thousands, without loading them all.
 */
export function EntityPicker({
  search,
  value,
  onChange,
  placeholder,
  autoFocus,
}: EntityPickerProps) {
  const t = useTranslations("staff.picker");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      search(query)
        .then((result) => {
          if (!cancelled) setOptions(result);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
          autoFocus={autoFocus}
          aria-label={placeholder}
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin" />
        )}
      </div>
      {/* A plain list of toggle buttons: a `listbox` may not contain
          buttons, and these need to be reachable with Tab. */}
      <ul
        className="max-h-56 overflow-y-auto rounded-md border"
        aria-label={placeholder}
        aria-busy={loading || undefined}
      >
        {!loading && options.length === 0 && (
          <li className="text-muted-foreground p-3 text-center text-sm">
            {t("empty")}
          </li>
        )}
        {options.map((option) => {
          const selected = option.id === value;
          const subtitle = option.disabled
            ? (option.disabledReason ?? option.hint)
            : option.hint;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={option.disabled}
                onClick={() => onChange(selected ? null : option)}
                className={cn(
                  "hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
                  selected && "bg-accent",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {option.label}
                  </span>
                  {subtitle && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {subtitle}
                    </span>
                  )}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
