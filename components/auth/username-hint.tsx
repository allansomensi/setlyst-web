"use client";

import { useTranslations } from "next-intl";
import { usernameIssue } from "@/lib/username-policy";
import { cn } from "@/lib/utils";

/**
 * Explains the username rules while typing: the general rule while the
 * field is empty or valid, the specific problem as soon as there is one.
 */
export function UsernameHint({
  id,
  username,
  className,
}: {
  id?: string;
  username: string;
  className?: string;
}) {
  const t = useTranslations("usernamePolicy");
  const issue = username.length > 0 ? usernameIssue(username) : null;

  return (
    <p
      id={id}
      className={cn(
        "text-xs",
        issue ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      {issue ? t(`issues.${issue}`) : t("rules")}
    </p>
  );
}
