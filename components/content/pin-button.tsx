"use client";

import { useOptimistic, useTransition } from "react";
import { Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { pinItem, unpinItem } from "@/lib/actions/pins";
import { cn } from "@/lib/utils";
import type { PinItemType } from "@/types/content";

interface PinButtonProps {
  type: PinItemType;
  id: string;
  /** The item's name, for the accessible label. */
  name: string;
  pinned: boolean;
  /** `icon` in rows and cards, `default` in detail headers. */
  variant?: "icon" | "default";
  className?: string;
}

/**
 * Pins an item to the home page ("Fixados") or unpins it. Optimistic:
 * the icon flips at once and flips back if the API refuses (limit of 12,
 * lost access). No spinner while the request runs: the flipped icon is
 * the feedback, and the button stays disabled (aria-busy) until it lands.
 */
export function PinButton({
  type,
  id,
  name,
  pinned,
  variant = "icon",
  className,
}: PinButtonProps) {
  const t = useTranslations("pins");
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(pinned);

  const label = optimistic
    ? t("unpinNamed", { name })
    : t("pinNamed", { name });
  const short = optimistic ? t("unpin") : t("pin");

  const toggle = () => {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const result = next ? await pinItem(type, id) : await unpinItem(type, id);
      if (!result.success) {
        toastActionError(result, result.error || t("failed"));
        return;
      }
      toast.success(next ? t("pinned") : t("unpinned"), { id: `pin-${id}` });
    });
  };

  const Icon = optimistic ? PinOff : Pin;

  if (variant === "default") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={toggle}
        disabled={isPending}
        aria-busy={isPending}
        aria-pressed={optimistic}
        aria-label={label}
        className={cn("gap-2", className)}
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">{short}</span>
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          disabled={isPending}
          aria-busy={isPending}
          aria-pressed={optimistic}
          aria-label={label}
          data-no-row-click
          className={cn(
            "shrink-0",
            optimistic ? "text-primary" : "text-muted-foreground",
            className,
          )}
        >
          <Pin
            className={cn("h-4 w-4", optimistic && "fill-current")}
            aria-hidden
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{short}</TooltipContent>
    </Tooltip>
  );
}
