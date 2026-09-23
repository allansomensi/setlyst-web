"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Link } from "@/components/nav-link";
import { LEGAL_HREFS } from "@/lib/legal";
import { cn } from "@/lib/utils";

export interface TermsConsentProps {
  /** "Li e aceito os Termos de Uso e a Política de Privacidade". */
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  /**
   * Optional marketing opt-in. The checkbox is shown only when
   * `onMarketingChange` is given; it is never pre-checked by this
   * component (LGPD: consent must be an affirmative act).
   */
  marketing?: boolean;
  onMarketingChange?: (marketing: boolean) => void;
  /** Shows the "accept to continue" error under the terms checkbox. */
  invalid?: boolean;
  disabled?: boolean;
  /** Form field names, for forms posted as `FormData`. */
  acceptedName?: string;
  marketingName?: string;
  className?: string;
}

const checkboxClass =
  "border-input accent-primary focus-visible:ring-ring/50 mt-0.5 size-4 shrink-0 cursor-pointer rounded outline-none focus-visible:ring-3 disabled:cursor-not-allowed";

/**
 * Consent block for sign-up (and the Google sign-up consent step): the
 * required terms checkbox with links to the Terms of Use and the Privacy
 * Policy (opening in a new tab so a half-filled form isn't lost), plus the
 * optional marketing opt-in. Fully controlled.
 */
export function TermsConsent({
  accepted,
  onAcceptedChange,
  marketing = false,
  onMarketingChange,
  invalid = false,
  disabled = false,
  acceptedName = "accept_terms",
  marketingName = "marketing_opt_in",
  className,
}: TermsConsentProps) {
  const t = useTranslations("legal.consent");
  const id = useId();
  const errorId = `${id}-error`;

  const docLink = (href: string) =>
    function ConsentLink(chunks: React.ReactNode) {
      return (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-0.5 font-medium underline-offset-4 hover:underline"
        >
          {chunks}
          <ExternalLink aria-hidden className="size-3" />
          <span className="sr-only"> {t("newTab")}</span>
        </Link>
      );
    };

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <div>
        <div className="flex items-start gap-2.5">
          <input
            id={`${id}-terms`}
            type="checkbox"
            name={acceptedName}
            value="true"
            required
            checked={accepted}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            onChange={(event) => onAcceptedChange(event.target.checked)}
            className={checkboxClass}
          />
          <label htmlFor={`${id}-terms`} className="leading-snug">
            {t.rich("terms", {
              terms: docLink(LEGAL_HREFS.terms),
              privacy: docLink(LEGAL_HREFS.privacy),
            })}
          </label>
        </div>
        {invalid && (
          <p
            id={errorId}
            role="alert"
            className="text-destructive mt-1.5 ml-6.5"
          >
            {t("required")}
          </p>
        )}
      </div>

      {onMarketingChange && (
        <div className="flex items-start gap-2.5">
          <input
            id={`${id}-marketing`}
            type="checkbox"
            name={marketingName}
            value="true"
            checked={marketing}
            disabled={disabled}
            onChange={(event) => onMarketingChange(event.target.checked)}
            className={checkboxClass}
          />
          <label
            htmlFor={`${id}-marketing`}
            className="text-muted-foreground leading-snug"
          >
            {t("marketing")}
          </label>
        </div>
      )}
    </div>
  );
}
