"use client";

import { Check, Circle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PASSWORD_RULES,
  passwordIssues,
  passwordRuleStates,
  passwordStrength,
} from "@/lib/password-policy";
import { cn } from "@/lib/utils";

const STRENGTH_STYLES = [
  "bg-muted",
  "bg-destructive",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
] as const;

interface PasswordRequirementsProps {
  password: string;
  /** Enables the "doesn't contain your username" rule. */
  username?: string | null;
  className?: string;
}

/**
 * Live checklist of the password policy plus a strength meter. Mirrors
 * the API's rules (lib/password-policy.ts), so a password that ticks
 * every box here is accepted there.
 */
export function PasswordRequirements({
  password,
  username,
  className,
}: PasswordRequirementsProps) {
  const t = useTranslations("passwordPolicy");
  const states = passwordRuleStates(password);
  const issues = passwordIssues(password, username);
  const strength = passwordStrength(password);
  const touched = password.length > 0;

  const extra: { key: string; ok: boolean }[] = [];
  if (touched && username && username.trim().length >= 3) {
    extra.push({
      key: "noUsername",
      ok: !issues.includes("contains_username"),
    });
  }
  if (touched && issues.includes("too_common")) {
    extra.push({ key: "notCommon", ok: false });
  }

  return (
    <div className={cn("space-y-2", className)} aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                strength >= level ? STRENGTH_STYLES[strength] : "bg-muted",
              )}
            />
          ))}
        </div>
        <span className="text-muted-foreground w-20 text-right text-xs">
          {touched ? t(`strength.${strength}`) : ""}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => (
          <Requirement
            key={rule}
            ok={states[rule]}
            touched={touched}
            label={t(`rules.${rule}`)}
          />
        ))}
        {extra.map(({ key, ok }) => (
          <Requirement
            key={key}
            ok={ok}
            touched={touched}
            label={t(`rules.${key}`)}
          />
        ))}
      </ul>
    </div>
  );
}

function Requirement({
  ok,
  touched,
  label,
}: {
  ok: boolean;
  touched: boolean;
  label: string;
}) {
  const Icon = !touched ? Circle : ok ? Check : X;
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        !touched && "text-muted-foreground",
        touched && ok && "text-emerald-600 dark:text-emerald-400",
        touched && !ok && "text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
    </li>
  );
}
