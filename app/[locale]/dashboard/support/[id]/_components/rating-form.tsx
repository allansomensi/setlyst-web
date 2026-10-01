"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastActionError } from "@/lib/action-toast";
import { SUPPORT_RATING_COMMENT_MAX } from "@/lib/support";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { rateSupportTicket } from "../../actions";

const VALUES = [1, 2, 3, 4, 5] as const;

/**
 * "How did we do?": one to five stars and an optional comment, once per
 * resolved request. The stars are native radio buttons (arrow keys move
 * between them), drawn as icons.
 */
export function RatingForm({ ticketId }: { ticketId: string }) {
  const t = useTranslations("support.rating");
  const tCommon = useTranslations("common");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const shown = hovered || rating;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isPending || rating < 1) return;
    startTransition(async () => {
      const result = await rateSupportTicket(ticketId, rating, comment);
      if (!result.success) {
        toastActionError(result, result.error);
        return;
      }
      toast.success(t("thanks"));
    });
  };

  return (
    <form
      onSubmit={submit}
      className="bg-card space-y-3 rounded-xl border p-4 shadow-(--shadow-surface)"
    >
      <fieldset className="space-y-2" disabled={isPending}>
        <legend className="text-sm font-semibold">{t("title")}</legend>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {VALUES.map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-md p-0.5"
              onMouseEnter={() => setHovered(value)}
            >
              <input
                type="radio"
                name="support-rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="peer sr-only"
              />
              <span className="sr-only">{t("stars", { count: value })}</span>
              <Star
                aria-hidden
                className={cn(
                  "peer-focus-visible:ring-ring/50 h-7 w-7 rounded-sm transition-colors peer-focus-visible:ring-3",
                  value <= shown
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/50",
                )}
              />
            </label>
          ))}
          {shown > 0 && (
            <span className="text-muted-foreground ml-2 text-sm" aria-hidden>
              {t(`labels.${shown}`)}
            </span>
          )}
        </div>
      </fieldset>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="support-rating-comment">
            {t("commentLabel")}{" "}
            <span className="text-muted-foreground font-normal">
              ({tCommon("optional")})
            </span>
          </Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {comment.length}/{SUPPORT_RATING_COMMENT_MAX}
          </span>
        </div>
        <Textarea
          id="support-rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={SUPPORT_RATING_COMMENT_MAX}
          disabled={isPending}
          placeholder={t("commentPlaceholder")}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || rating < 1}>
          {isPending && <Loader2 className="animate-spin" aria-hidden />}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
