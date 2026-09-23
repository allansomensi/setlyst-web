"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleButton, GoogleLogo } from "@/components/auth/google-button";
import { TermsConsent } from "@/components/legal/terms-consent";

interface GoogleConsentFormProps {
  email: string | null;
  name: string | null;
  referralCode: string | null;
  callbackPath: string | null;
}

export function GoogleConsentForm({
  email,
  name,
  referralCode,
  callbackPath,
}: GoogleConsentFormProps) {
  const t = useTranslations("googleAuth");
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [attempted, setAttempted] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="bg-primary/10 text-primary mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
          <UserPlus className="size-6" />
        </div>
        <CardTitle className="text-2xl font-bold">
          {t("consentTitle")}
        </CardTitle>
        <CardDescription>{t("consentDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {(email || name) && (
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-white">
              <GoogleLogo />
            </span>
            <div className="min-w-0 text-sm">
              {name && <p className="truncate font-medium">{name}</p>}
              {email && (
                <p className="text-muted-foreground truncate">{email}</p>
              )}
            </div>
          </div>
        )}

        <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
          <li>{t("consentPointUsername")}</li>
          <li>{t("consentPointPassword")}</li>
        </ul>

        <TermsConsent
          accepted={accepted}
          onAcceptedChange={setAccepted}
          marketing={marketing}
          onMarketingChange={setMarketing}
          invalid={attempted && !accepted}
        />

        <GoogleButton
          label={t("consentSubmit")}
          acceptTerms={accepted}
          marketingOptIn={marketing}
          referralCode={referralCode}
          callbackPath={callbackPath}
          onBeforeStart={() => {
            setAttempted(true);
            return accepted;
          }}
        />
      </CardContent>
      <CardFooter className="justify-center border-t py-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("consentCancel")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
