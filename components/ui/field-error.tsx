import { CircleAlert } from "lucide-react";
import { errorIdFor } from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * The inline error under a form field. Its id is what `fieldA11y()` points
 * the field's `aria-describedby` at; `role="alert"` announces it the moment
 * it appears.
 */
export function FieldError({
  fieldId,
  message,
  className,
}: {
  fieldId: string;
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={errorIdFor(fieldId)}
      role="alert"
      className={cn(
        "text-destructive flex items-start gap-1.5 text-xs leading-snug",
        className,
      )}
    >
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
