"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "./confirm-dialog";

interface DangerSectionProps {
  title: string;
  subtitle: string;
  /** Why a softer alternative is usually better. */
  advice?: string;
  consequences: string[];
  buttonLabel: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmLabel: string;
  /** Text that must be typed exactly before the delete is enabled. */
  confirmText: string;
  pending: boolean;
  onConfirm: () => void;
}

/**
 * Permanent deletion, deliberately out of the way: collapsed by default,
 * spells out the consequences, uses an outline (not solid red) button and
 * asks for the name to be typed before it can proceed.
 */
export function DangerSection({
  title,
  subtitle,
  advice,
  consequences,
  buttonLabel,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  confirmText,
  pending,
  onConfirm,
}: DangerSectionProps) {
  const t = useTranslations("staff.danger");
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    // A surface like the app's own danger zones (band, account): card
    // background and radius, with only the border tinted.
    <section className="bg-card border-destructive/30 overflow-hidden rounded-xl border shadow-(--shadow-surface)">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="focus-visible:ring-ring/50 hover:bg-muted/40 flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset"
        aria-expanded={expanded}
      >
        <span className="min-w-0">
          <span className="text-destructive block text-sm font-semibold">
            {title}
          </span>
          <span className="text-muted-foreground block text-xs">
            {subtitle}
          </span>
        </span>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 shrink-0 motion-safe:transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {expanded && (
        <div className="space-y-3 border-t px-4 py-4">
          {advice && <p className="text-muted-foreground text-sm">{advice}</p>}
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            {consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
            {buttonLabel}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) setTyped("");
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        onConfirm={onConfirm}
        pending={pending}
        destructive
        confirmDisabled={typed.trim() !== confirmText.trim()}
      >
        <div className="space-y-1.5">
          <Label htmlFor="danger-confirm-text">
            {t("typeToConfirm", { username: confirmText })}
          </Label>
          <Input
            id="danger-confirm-text"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
      </ConfirmDialog>
    </section>
  );
}
