"use client";

import { useState, useRef, useTransition } from "react";
import { changePassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRound, Loader2, Save, ShieldCheck } from "lucide-react";

export function ChangePasswordSection() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleAction = (formData: FormData) => {
    const new_password = formData.get("new_password") as string;
    const confirm_password = formData.get("confirm_password") as string;

    if (new_password !== confirm_password) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }

    startTransition(async () => {
      const result = await changePassword(formData);

      if (result.success) {
        toast.success(t("passwordChanged"));
        setIsOpen(false);
      } else {
        toast.error(result.error || t("failed"));
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && formRef.current) {
      formRef.current.reset();
    }
  };

  return (
    <>
      <Card className="md:bg-card border-none bg-transparent shadow-none md:border md:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5" />
              {t("security")}
            </CardTitle>
            <CardDescription>{t("securityDescription")}</CardDescription>
          </div>

          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {t("changePasswordTitle")}
          </Button>
        </CardHeader>
      </Card>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t("changePasswordTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("changePasswordDescription")}
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} action={handleAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">{t("currentPassword")}</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">{t("newPassword")}</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                minLength={8}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                minLength={8}
                required
                disabled={isPending}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isPending ? t("saving") : t("updatePassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
