"use client";

import { forwardRef, useRef } from "react";
import { Input } from "@/components/ui/input";
import { sanitizeOtp } from "@/lib/auth-flow";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called once when the sixth digit is typed or pasted. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * A one-time code field: one input (so paste, password managers and SMS
 * or e-mail autofill all work) accepting only digits, shown large and
 * spaced. Calls `onComplete` as soon as the code is complete, so the
 * person never has to reach for the submit button.
 */
export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(
  function OtpInput(
    {
      id,
      value,
      onChange,
      onComplete,
      length = 6,
      disabled,
      invalid,
      autoFocus,
      className,
      ...aria
    },
    ref,
  ) {
    const lastCompleted = useRef<string | null>(null);

    return (
      <Input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        placeholder={"•".repeat(length)}
        value={value}
        onChange={(event) => {
          const next = sanitizeOtp(event.target.value, length);
          onChange(next);
          if (next.length === length && lastCompleted.current !== next) {
            lastCompleted.current = next;
            onComplete?.(next);
          } else if (next.length < length) {
            lastCompleted.current = null;
          }
        }}
        className={cn(
          "h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em] placeholder:text-current/25 md:text-2xl",
          className,
        )}
        {...aria}
      />
    );
  },
);
