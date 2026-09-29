"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Layers, Loader2 } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppRouter } from "@/hooks/use-app-router";
import { toastActionError } from "@/lib/action-toast";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { createSongVersion } from "@/app/[locale]/dashboard/songs/actions";
import type { SongVersion } from "@/types/api";

const MAX_LABEL = 60;

/**
 * The versions of a song — the original and, say, a simplified chart or an
 * acoustic arrangement. Each is a song of its own (its own chart, key and
 * tempo) that can go into setlists like any other; this card ties them
 * together and creates new ones.
 */
export function SongVersionsCard({
  songId,
  versions,
  canCreate,
}: {
  songId: string;
  /** The family, original first (`null` when it couldn't load). */
  versions: SongVersion[] | null;
  /** Versions are made from the person's own songs, online. */
  canCreate: boolean;
}) {
  const t = useTranslations("songDetail.versions");
  const [isCreating, setIsCreating] = useState(false);

  // A song with no versions lists just itself.
  const family = versions ?? [];
  const hasVersions = family.length > 1;
  if (!hasVersions && !canCreate) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions === null ? (
          <p className="text-muted-foreground text-sm">{t("loadError")}</p>
        ) : !hasVersions ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="space-y-1">
            {family.map((version) => {
              const current = version.id === songId;
              return (
                <li key={version.id}>
                  <Link
                    href={`/dashboard/songs/${version.id}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "hover:bg-muted/60 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm",
                      current && "bg-muted/60",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {current && (
                        <Check
                          className="text-primary h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                      )}
                      <span className="truncate font-medium">
                        {version.is_original
                          ? t("original")
                          : (version.version_label ?? t("unnamed"))}
                      </span>
                    </span>
                    {version.tonality && (
                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 px-1.5 font-mono text-[10px]"
                      >
                        {version.tonality}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {canCreate && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t("create")}
          </Button>
        )}
      </CardContent>

      {canCreate && (
        <NewVersionDialog
          key={isCreating ? "open" : "closed"}
          songId={songId}
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          taken={family.map((v) => (v.version_label ?? "").toLowerCase())}
        />
      )}
    </Card>
  );
}

function NewVersionDialog({
  songId,
  isOpen,
  onClose,
  taken,
}: {
  songId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Labels already used in the family (lower case). */
  taken: string[];
}) {
  const t = useTranslations("songDetail.versions");
  const tCommon = useTranslations("common");
  const router = useAppRouter();
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const suggestions = t("suggestions")
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s && !taken.includes(s.toLowerCase()));

  const trimmed = label.trim();
  const duplicate = taken.includes(trimmed.toLowerCase());
  const valid = trimmed.length > 0 && trimmed.length <= MAX_LABEL && !duplicate;

  const submit = () => {
    // A double Enter must not create the version twice.
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await createSongVersion(songId, trimmed);
      if (!result.success) {
        toastActionError(
          result,
          result.apiCode === "ALREADY_EXISTS" ? t("duplicate") : result.error,
        );
        return;
      }
      toast.success(t("created", { label: trimmed }));
      onClose();
      if (result.data) router.push(`/dashboard/songs/${result.data.id}`);
    });
  };

  return (
    // Can't be closed while saving (the request is already on its way,
    // and its success navigates to the new version).
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isPending && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="version-label">{t("label")}</Label>
            <Input
              id="version-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={MAX_LABEL}
              placeholder={t("labelPlaceholder")}
              autoFocus
              disabled={isPending}
              aria-invalid={duplicate || undefined}
            />
            {duplicate && (
              <p className="text-destructive text-xs">{t("duplicate")}</p>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setLabel(suggestion)}
                  disabled={isPending}
                  className="bg-muted hover:bg-accent hover:text-accent-foreground rounded-full px-2.5 py-0.5 text-xs transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              )}
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
