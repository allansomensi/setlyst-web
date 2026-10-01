"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** The editor's keyboard shortcuts, by group. */
const GROUPS: { id: string; keys: { id: string; combo: string[] }[] }[] = [
  {
    id: "navigate",
    keys: [
      { id: "move", combo: ["←", "→"] },
      { id: "extend", combo: ["Shift", "← →"] },
      { id: "extendClick", combo: ["Shift", "Click"] },
      { id: "escape", combo: ["Esc"] },
    ],
  },
  {
    id: "write",
    keys: [
      { id: "degree", combo: ["Enter"] },
      { id: "diatonic", combo: ["1 … 7"] },
      { id: "suggestion", combo: ["G"] },
      { id: "functions", combo: ["T", "S", "D"] },
      { id: "aem", combo: ["A"] },
      { id: "clear", combo: ["Delete"] },
    ],
  },
  {
    id: "document",
    keys: [
      { id: "undo", combo: ["Ctrl", "Z"] },
      { id: "redo", combo: ["Ctrl", "Shift", "Z"] },
      { id: "save", combo: ["Ctrl", "S"] },
      { id: "assistant", combo: ["Shift", "A"] },
      { id: "help", combo: ["?"] },
    ],
  },
];

export function AnalysisShortcuts({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("analysis.shortcutsDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <section key={group.id} className="space-y-2">
              <h3 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                {t(`groups.${group.id}`)}
              </h3>
              <dl className="space-y-2">
                {group.keys.map((key) => (
                  <div key={key.id} className="space-y-1">
                    <dt className="flex flex-wrap items-center gap-1">
                      {key.combo.map((part, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1"
                        >
                          {i > 0 && (
                            <span className="text-muted-foreground text-xs">
                              +
                            </span>
                          )}
                          <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold shadow-[inset_0_-1px_0_var(--border)]">
                            {part}
                          </kbd>
                        </span>
                      ))}
                    </dt>
                    <dd className="text-muted-foreground text-xs">
                      {t(`keys.${key.id}`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
