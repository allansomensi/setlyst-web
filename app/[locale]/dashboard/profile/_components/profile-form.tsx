"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  AtSign,
  Check,
  Loader2,
  MapPin,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UsernameHint } from "@/components/auth/username-hint";
import { InstrumentsInput } from "@/components/account/instruments-input";
import { useAppRouter } from "@/hooks/use-app-router";
import { toast } from "@/lib/toast";
import { toastActionError } from "@/lib/action-toast";
import { isValidUsername } from "@/lib/username-policy";
import { BIO_MAX, LOCATION_MAX } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { User } from "@/types/api";
import { checkUsernameAvailability, updateProfile } from "../actions";

type AvailabilityStatus =
  "idle" | "checking" | "available" | "unavailable" | "invalid";

interface ProfileFormProps {
  user: User;
  inCooldown: boolean;
  cooldownDate: string | null;
}

function initialValues(user: User) {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    username: user.username,
    bio: user.bio ?? "",
    location: user.location ?? "",
    instruments: user.instruments ?? [],
  };
}

/**
 * Name, username, bio, location and instruments: what other musicians
 * see on the public profile. Always editable; "Salvar" lights up once
 * something changed.
 */
export function ProfileForm({
  user,
  inCooldown,
  cooldownDate,
}: ProfileFormProps) {
  const t = useTranslations("profile");
  const router = useAppRouter();
  const [saved, setSaved] = useState(() => initialValues(user));
  const [values, setValues] = useState(saved);
  const [isPending, startTransition] = useTransition();
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = <K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  // Checked while typing (debounced), from the change handler rather than
  // an effect, so no state is set synchronously during render effects.
  const handleUsernameChange = (value: string) => {
    set("username", value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed === saved.username || inCooldown) {
      setAvailability("idle");
      return;
    }
    if (!isValidUsername(trimmed)) {
      setAvailability("invalid");
      return;
    }
    setAvailability("checking");
    debounceRef.current = setTimeout(() => {
      checkUsernameAvailability(trimmed).then((result) => {
        setAvailability(
          result === null
            ? "idle"
            : result.available
              ? "available"
              : "unavailable",
        );
      });
    }, 400);
  };

  const blocked =
    availability === "unavailable" ||
    availability === "invalid" ||
    availability === "checking";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dirty || blocked || isPending) return;
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.success) {
        toastActionError(result, result.error || t("failed"));
        return;
      }
      const next = result.data ? initialValues(result.data) : values;
      setSaved(next);
      setValues(next);
      setAvailability("idle");
      toast.success(t("success"));
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="text-primary size-4" />
            {t("personalInfo")}
          </CardTitle>
          <CardDescription>{t("personalInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t("firstNameLabel")}</Label>
              <Input
                id="first_name"
                autoComplete="given-name"
                maxLength={50}
                value={values.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                disabled={isPending}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("lastNameLabel")}</Label>
              <Input
                id="last_name"
                autoComplete="family-name"
                maxLength={50}
                value={values.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                disabled={isPending}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">{t("usernameLabel")}</Label>
            <div className="relative">
              <AtSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={20}
                value={values.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                disabled={isPending || inCooldown}
                aria-invalid={
                  availability === "unavailable" || availability === "invalid"
                    ? true
                    : undefined
                }
                className={cn(
                  "h-10 pl-9",
                  availability === "available" && "border-emerald-500 pr-9",
                  (availability === "unavailable" ||
                    availability === "invalid") &&
                    "pr-9",
                )}
              />
              {availability === "checking" && (
                <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
              )}
              {availability === "available" && (
                <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-500" />
              )}
              {availability === "unavailable" && (
                <AlertCircle className="text-destructive absolute top-1/2 right-3 size-4 -translate-y-1/2" />
              )}
            </div>
            {availability === "invalid" && (
              <UsernameHint username={values.username.trim()} />
            )}
            {availability === "unavailable" && (
              <p className="text-destructive text-xs">{t("usernameTaken")}</p>
            )}
            {availability === "available" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500">
                {t("usernameAvailable")}
              </p>
            )}
            {inCooldown && cooldownDate ? (
              <p className="text-muted-foreground text-xs">
                {t("usernameCooldown", { date: cooldownDate })}
              </p>
            ) : (
              availability === "idle" && (
                <p className="text-muted-foreground text-xs">
                  {t("usernameHint")}
                </p>
              )
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="bio">{t("bioLabel")}</Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  values.bio.length > BIO_MAX - 20
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {t("counter", { count: values.bio.length, max: BIO_MAX })}
              </span>
            </div>
            <Textarea
              id="bio"
              rows={3}
              maxLength={BIO_MAX}
              placeholder={t("bioPlaceholder")}
              value={values.bio}
              onChange={(e) => set("bio", e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t("locationLabel")}</Label>
            <div className="relative">
              <MapPin className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="location"
                autoComplete="address-level2"
                maxLength={LOCATION_MAX}
                placeholder={t("locationPlaceholder")}
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
                disabled={isPending}
                className="h-10 pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instruments">{t("instrumentsLabel")}</Label>
            <InstrumentsInput
              id="instruments"
              value={values.instruments}
              onChange={(next) => set("instruments", next)}
              disabled={isPending}
              aria-describedby="instruments-hint"
            />
            <p id="instruments-hint" className="text-muted-foreground text-xs">
              {t("instruments.hint")}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t">
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setValues(saved);
                setAvailability("idle");
              }}
            >
              <RotateCcw className="mr-2 size-4" />
              {t("discard")}
            </Button>
          )}
          <Button type="submit" disabled={!dirty || blocked || isPending}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {isPending ? t("saving") : t("saveChanges")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
