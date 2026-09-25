"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, Info, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/components/nav-link";
import { UserAvatar } from "@/components/user-avatar";
import { useAppRouter } from "@/hooks/use-app-router";
import { toastActionError } from "@/lib/action-toast";
import { legalHref } from "@/lib/legal";
import { AVATAR_URL_MAX, isAcceptableAvatarUrl } from "@/lib/profile";
import { toast } from "@/lib/toast";
import { updateAvatar } from "../actions";

/**
 * Profile picture by link. The image is never loaded from the typed
 * address directly: once saved, it is fetched through the app's image
 * proxy (which checks type and size) and shown here.
 */
export function AvatarCard({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("profile.avatar");
  const router = useAppRouter();
  const [current, setCurrent] = useState(avatarUrl);
  const [value, setValue] = useState(avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = value.trim();
  const changed = trimmed !== (current ?? "");
  const looksValid = trimmed === "" || isAcceptableAvatarUrl(trimmed);

  const save = (next: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await updateAvatar(next);
      if (!result.success) {
        if (
          ("code" in result && result.code) ||
          result.apiCode === "EMAIL_NOT_VERIFIED"
        ) {
          toastActionError(result, result.error);
          return;
        }
        setError(result.error);
        return;
      }
      const saved = result.data?.avatar_url ?? null;
      setCurrent(saved);
      setValue(saved ?? "");
      toast.success(next ? t("saved") : t("removed"));
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <UserAvatar
            userId={userId}
            name={name}
            avatarUrl={current}
            size="xl"
            className="ring-background size-24 text-3xl shadow-sm ring-4"
          />
          <span className="text-muted-foreground text-xs">{t("preview")}</span>
        </div>
        <form
          className="min-w-0 flex-1 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (changed && looksValid && trimmed) save(trimmed);
          }}
          noValidate
        >
          <Label htmlFor="avatar-url">{t("label")}</Label>
          <Input
            id="avatar-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            maxLength={AVATAR_URL_MAX}
            placeholder="https://"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            disabled={isPending}
            aria-invalid={!looksValid || Boolean(error) || undefined}
            aria-describedby="avatar-help"
            className="h-10"
          />
          {(error || !looksValid) && (
            <p role="alert" className="text-destructive text-xs font-medium">
              {error ?? t("invalid")}
            </p>
          )}
          <div
            id="avatar-help"
            className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed"
          >
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p>
              {t.rich("help", {
                guidelines: (chunks) => (
                  <Link
                    href={legalHref("guidelines")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t">
        {current && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => save(null)}
            disabled={isPending}
          >
            <Trash2 className="mr-2 size-4" />
            {t("remove")}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => trimmed && save(trimmed)}
          disabled={isPending || !changed || !looksValid || !trimmed}
        >
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
