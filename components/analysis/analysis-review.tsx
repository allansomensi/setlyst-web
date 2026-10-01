"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  KeyRound,
  Trash2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  parseDegree,
  prettyAccidentals,
  type Degree,
  type HarmonicFunction,
} from "@/lib/music/analysis";
import type { Issue } from "@/lib/music/analysis-insights";

export interface ReviewActions {
  select: (index: number) => void;
  setDegree: (index: number, degree: Degree) => void;
  setFunction: (index: number, fn: HarmonicFunction) => void;
  removeConnection: (id: string) => void;
  removeNote: (id: string) => void;
  openAssistant: () => void;
}

/**
 * A second reading of the analysis, the way a teacher marks one: degrees
 * that don't match the chord they're written on, arrows that don't
 * resolve as drawn, functions at odds with the degree, empty passages.
 * Each item goes to its chord, and most come with the fix.
 */
export function AnalysisReview({
  issues,
  chords,
  actions,
  canEdit,
  className,
}: {
  issues: readonly Issue[];
  chords: readonly string[];
  actions: ReviewActions;
  canEdit: boolean;
  className?: string;
}) {
  const t = useTranslations("analysis.review");

  if (issues.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center",
          className,
        )}
      >
        <CheckCircle2 className="text-primary h-6 w-6" aria-hidden />
        <p className="text-sm font-semibold">{t("clean")}</p>
        <p className="text-muted-foreground text-xs">{t("cleanHint")}</p>
      </div>
    );
  }

  const warnings = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-muted-foreground text-xs">
        {t("count", { warnings, notes: issues.length - warnings })}
      </p>
      <ul className="space-y-2">
        {issues.map((issue, n) => {
          const chord = chords[issue.at] ?? "?";
          const values = {
            chord,
            position: issue.at + 1,
            expected: prettyAccidentals(issue.expected ?? ""),
          };
          const expectedDegree =
            issue.expected &&
            (issue.id === "rootMismatch" || issue.id === "qualityMismatch")
              ? parseDegree(issue.expected)
              : null;
          const warning = issue.severity === "warning";
          return (
            <li
              key={`${issue.id}-${issue.at}-${issue.ref ?? n}`}
              className={cn(
                "space-y-2 rounded-lg border px-3 py-2.5",
                warning && "border-destructive/30 bg-destructive/[0.03]",
              )}
            >
              <div className="flex items-start gap-2">
                {warning ? (
                  <AlertTriangle
                    className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-label={t("warning")}
                  />
                ) : (
                  <Info
                    className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-label={t("info")}
                  />
                )}
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm leading-snug font-semibold">
                    {t(`items.${issue.id}.title`, values)}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t(`items.${issue.id}.description`, values)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-5.5">
                {issue.id !== "noKey" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => actions.select(issue.at)}
                  >
                    {t("goTo", { chord })}
                  </Button>
                )}
                {canEdit && expectedDegree && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => actions.setDegree(issue.at, expectedDegree)}
                  >
                    <Wand2 className="h-3 w-3" aria-hidden />
                    {t("use", { value: values.expected })}
                  </Button>
                )}
                {canEdit &&
                  issue.id === "functionConflict" &&
                  issue.expected && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() =>
                        actions.setFunction(
                          issue.at,
                          issue.expected as HarmonicFunction,
                        )
                      }
                    >
                      <Wand2 className="h-3 w-3" aria-hidden />
                      {t("use", { value: issue.expected })}
                    </Button>
                  )}
                {canEdit &&
                  issue.ref &&
                  (issue.id === "dominantTarget" ||
                    issue.id === "subVTarget" ||
                    issue.id === "twoFiveShape") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => actions.removeConnection(issue.ref!)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      {t("removeLine")}
                    </Button>
                  )}
                {canEdit && issue.ref && issue.id === "emptyPassage" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => actions.removeNote(issue.ref!)}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                    {t("removePassage")}
                  </Button>
                )}
                {canEdit && issue.id === "noKey" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 gap-1.5 text-xs"
                    onClick={actions.openAssistant}
                  >
                    <KeyRound className="h-3 w-3" aria-hidden />
                    {t("setKey")}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
