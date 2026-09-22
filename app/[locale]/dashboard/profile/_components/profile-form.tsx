"use client";

import { useState, useTransition, useRef } from "react";
import { User } from "@/types/api";
import { updateProfile, checkUsernameAvailability } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toastActionError } from "@/lib/action-toast";
import {
  User as UserIcon,
  Mail,
  Edit2,
  X,
  Save,
  CalendarDays,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

interface ProfileFormProps {
  user: User;
  /** Pre-formatted on the server — see the comment in page.tsx. */
  registrationDate: string;
  inCooldown: boolean;
  cooldownDate: string | null;
}

export function ProfileForm({
  user,
  registrationDate,
  inCooldown,
  cooldownDate,
}: ProfileFormProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [username, setUsername] = useState(user.username);
  const [availability, setAvailability] = useState<AvailabilityStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debouncing here, driven directly from the input's onChange, rather
  // than from an effect watching `username` — an effect would need to
  // call setState synchronously to kick off "checking" or to reset back
  // to "idle", which is exactly the pattern React's effect rules steer
  // away from. An event handler has no such restriction.
  const handleUsernameChange = (value: string) => {
    setUsername(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();

    // No point checking: unchanged, too short, or already blocked by
    // cooldown (the field is disabled in that case anyway).
    if (trimmed === user.username || trimmed.length < 3 || inCooldown) {
      setAvailability("idle");
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

  const handleAction = (formData: FormData) => {
    if (availability === "unavailable") {
      toast.error(t("usernameTaken"));
      return;
    }

    const payload = {
      username: formData.get("username") as string,
      email: (formData.get("email") as string) || null,
      first_name: (formData.get("first_name") as string) || null,
      last_name: (formData.get("last_name") as string) || null,
    };

    startTransition(async () => {
      const result = await updateProfile(payload);

      if (result.success) {
        toast.success(t("success"));
        setIsEditing(false);
        setAvailability("idle");
      } else {
        toastActionError(result, result.error || t("failed"));
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <form action={handleAction}>
        <div className="grid gap-8 md:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-muted border-primary/10 flex h-32 w-32 items-center justify-center rounded-full border-2">
              <UserIcon className="text-muted-foreground h-16 w-16" />
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
            </div>
          </div>

          <Card
            className={cn(
              "md:bg-card border-none bg-transparent shadow-none md:border md:shadow-sm",
              isPending && "pointer-events-none opacity-70",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xl">{t("personalInfo")}</CardTitle>
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={isPending}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  {t("editProfile")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(user.username);
                    setAvailability("idle");
                  }}
                  disabled={isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  {tCommon("cancel")}
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t("firstNameLabel")}</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={user.first_name || ""}
                    disabled={!isEditing || isPending}
                    className={cn(
                      !isEditing &&
                        "bg-muted/50 cursor-default border-transparent",
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">{t("lastNameLabel")}</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={user.last_name || ""}
                    disabled={!isEditing || isPending}
                    className={cn(
                      !isEditing &&
                        "bg-muted/50 cursor-default border-transparent",
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t("usernameLabel")}</Label>
                <div className="relative">
                  <UserIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="username"
                    name="username"
                    value={isEditing ? username : user.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    disabled={!isEditing || isPending || inCooldown}
                    className={cn(
                      "pl-9",
                      availability === "available" && "border-green-500 pr-9",
                      availability === "unavailable" &&
                        "border-destructive pr-9",
                      !isEditing &&
                        "bg-muted/50 cursor-default border-transparent",
                    )}
                    required
                  />
                  {isEditing && availability === "checking" && (
                    <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                  )}
                  {isEditing && availability === "available" && (
                    <Check className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                  {isEditing && availability === "unavailable" && (
                    <AlertCircle className="text-destructive absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                  )}
                </div>
                {isEditing && availability === "unavailable" && (
                  <p className="text-destructive text-xs">
                    {t("usernameTaken")}
                  </p>
                )}
                {isEditing && availability === "available" && (
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {t("usernameAvailable")}
                  </p>
                )}
                {isEditing && inCooldown && cooldownDate && (
                  <p className="text-muted-foreground text-xs">
                    {t("usernameCooldown", { date: cooldownDate })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user.email || ""}
                    disabled={!isEditing || isPending}
                    className={cn(
                      "pl-9",
                      !isEditing &&
                        "bg-muted/50 cursor-default border-transparent",
                    )}
                  />
                </div>
              </div>
            </CardContent>

            {isEditing && (
              <CardFooter className="bg-muted/30 flex justify-end rounded-b-lg border-t pt-6">
                <Button
                  type="submit"
                  disabled={isPending || availability === "unavailable"}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isPending ? t("saving") : t("saveChanges")}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </form>

      <div className="text-muted-foreground flex items-center justify-center gap-2 border-t pt-6 text-xs italic opacity-60">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{t("joinedOn", { date: registrationDate })}</span>
      </div>
    </div>
  );
}
