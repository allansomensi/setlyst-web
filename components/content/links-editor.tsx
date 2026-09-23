"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_LINK_LABEL_LENGTH,
  MAX_LINK_URL_LENGTH,
  MAX_LINKS,
  PROVIDER_NAMES,
  checkLinkUrl,
  newLinkDraft,
  type LinkDraft,
  type LinkDraftIssue,
} from "@/lib/content-links";
import { ProviderIcon } from "./provider-icon";

interface LinksEditorProps {
  idPrefix: string;
  value: LinkDraft[];
  onChange: (next: LinkDraft[]) => void;
  /** Issues from the last save attempt, by row key. */
  issues?: Record<string, LinkDraftIssue>;
  disabled?: boolean;
}

/**
 * Up to five reference links, each with an optional label. The provider
 * is recognized while typing; anything outside the accepted providers is
 * flagged before saving (the API refuses it too).
 */
export function LinksEditor({
  idPrefix,
  value,
  onChange,
  issues = {},
  disabled,
}: LinksEditorProps) {
  const t = useTranslations("links");

  const update = (key: string, patch: Partial<LinkDraft>) =>
    onChange(value.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const remove = (key: string) => onChange(value.filter((d) => d.key !== key));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">{t("hint")}</p>

      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-sm">
          {t("empty")}
        </p>
      )}

      <ol className="space-y-3">
        {value.map((draft, index) => {
          const check = draft.url.trim() ? checkLinkUrl(draft.url) : null;
          const provider = check?.ok ? check.provider : null;
          const liveIssue = check && !check.ok ? check.issue : null;
          const issue = issues[draft.key] ?? liveIssue;
          const urlId = `${idPrefix}-url-${draft.key}`;
          const labelId = `${idPrefix}-label-${draft.key}`;
          const errorId = `${idPrefix}-error-${draft.key}`;
          const position = index + 1;

          return (
            <li key={draft.key} className="rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <ProviderIcon provider={provider} className="mt-1.5" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1">
                    <label htmlFor={urlId} className="sr-only">
                      {t("urlLabel", { position })}
                    </label>
                    <Input
                      id={urlId}
                      type="url"
                      inputMode="url"
                      value={draft.url}
                      onChange={(e) =>
                        update(draft.key, { url: e.target.value })
                      }
                      placeholder={t("urlPlaceholder")}
                      maxLength={MAX_LINK_URL_LENGTH}
                      disabled={disabled}
                      aria-invalid={!!issue}
                      aria-describedby={issue ? errorId : undefined}
                      autoComplete="off"
                    />
                    <p
                      id={errorId}
                      className={
                        issue
                          ? "text-destructive text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {issue
                        ? t(`issues.${issue}`)
                        : provider
                          ? t("detected", {
                              provider: PROVIDER_NAMES[provider],
                            })
                          : " "}
                    </p>
                  </div>
                  <div>
                    <label htmlFor={labelId} className="sr-only">
                      {t("labelLabel", { position })}
                    </label>
                    <Input
                      id={labelId}
                      value={draft.label}
                      onChange={(e) =>
                        update(draft.key, { label: e.target.value })
                      }
                      placeholder={t("labelPlaceholder")}
                      maxLength={MAX_LINK_LABEL_LENGTH}
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => remove(draft.key)}
                    disabled={disabled}
                    aria-label={t("remove", { position })}
                    title={t("remove", { position })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={t("moveUp", { position })}
                    title={t("moveUp", { position })}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === value.length - 1}
                    aria-label={t("moveDown", { position })}
                    title={t("moveDown", { position })}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, newLinkDraft()])}
          disabled={disabled || value.length >= MAX_LINKS}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {t("add")}
        </Button>
        <span className="text-muted-foreground text-xs tabular-nums">
          {t("count", { count: value.length, max: MAX_LINKS })}
        </span>
      </div>
    </div>
  );
}
