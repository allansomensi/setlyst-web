"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export function ChangePasswordSection({
  username,
  passwordChangedLabel,
}: {
  username: string;
  /** e.g. "Last changed on 3 Sep 2026", or null when never changed. */
  passwordChangedLabel: string | null;
}) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card
        id="password"
        className="md:bg-card scroll-mt-20 border-none bg-transparent shadow-none md:border md:shadow-sm"
      >
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5" />
              {t("security")}
            </CardTitle>
            <CardDescription>{t("securityDescription")}</CardDescription>
            {passwordChangedLabel && (
              <p className="text-muted-foreground text-xs">
                {passwordChangedLabel}
              </p>
            )}
          </div>

          <Button variant="outline" onClick={() => setIsOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {t("changePasswordTitle")}
          </Button>
        </CardHeader>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t("changePasswordTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("changePasswordDescription")}
            </DialogDescription>
          </DialogHeader>
          {/* Keyed on open so fields reset every time the dialog opens. */}
          {isOpen && (
            <ChangePasswordForm
              username={username}
              secondaryAction={
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  {tCommon("cancel")}
                </Button>
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
