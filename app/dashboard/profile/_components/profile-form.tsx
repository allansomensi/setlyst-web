"use client";

import { useState, useTransition } from "react";
import { User } from "@/types/api";
import { updateProfile } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User as UserIcon,
  Mail,
  Edit2,
  X,
  Save,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileForm({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const registrationDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(user.created_at));

  const handleAction = (formData: FormData) => {
    const payload = {
      username: formData.get("username") as string,
      email: (formData.get("email") as string) || null,
      first_name: (formData.get("first_name") as string) || null,
      last_name: (formData.get("last_name") as string) || null,
    };

    startTransition(async () => {
      const result = await updateProfile(payload);

      if (result.success) {
        toast.success("Profile updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update profile");
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
              <CardTitle className="text-xl">Personal Information</CardTitle>
              {!isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={isPending}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
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
                  <Label htmlFor="last_name">Last Name</Label>
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
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <UserIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="username"
                    name="username"
                    defaultValue={user.username}
                    disabled={!isEditing || isPending}
                    className={cn(
                      "pl-9",
                      !isEditing &&
                        "bg-muted/50 cursor-default border-transparent",
                    )}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
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
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </form>

      <div className="text-muted-foreground flex items-center justify-center gap-2 border-t pt-6 text-xs italic opacity-60">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Joined on {registrationDate}</span>
      </div>
    </div>
  );
}
