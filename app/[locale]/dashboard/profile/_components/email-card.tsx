"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, CircleAlert, Mail, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailChangeDialog } from "@/components/account/email-change-dialog";
import { EmailVerificationDialog } from "@/components/account/email-verification-dialog";

/** The account's e-mail address, its verification and the change flow. */
export function EmailCard({
  email,
  verified,
  passwordSet,
  username,
}: {
  email: string | null;
  verified: boolean;
  passwordSet: boolean;
  username: string;
}) {
  const t = useTranslations("profile.email");
  const [changeOpen, setChangeOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {email ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium break-all">{email}</span>
            {verified ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <BadgeCheck />
                {t("verified")}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300">
                <CircleAlert />
                {t("unverified")}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        )}
        {email && !verified && (
          <p className="text-muted-foreground mt-2 text-sm">
            {t("unverifiedHint")}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t">
        {email && !verified && (
          <Button variant="outline" onClick={() => setVerifyOpen(true)}>
            <BadgeCheck className="mr-2 size-4" />
            {t("verify")}
          </Button>
        )}
        <Button
          variant={email ? "outline" : "default"}
          onClick={() => setChangeOpen(true)}
        >
          <Pencil className="mr-2 size-4" />
          {email ? t("change") : t("add")}
        </Button>
      </CardFooter>

      <EmailChangeDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        currentEmail={email}
        passwordSet={passwordSet}
        username={username}
      />
      {email && (
        <EmailVerificationDialog
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          email={email}
        />
      )}
    </Card>
  );
}
