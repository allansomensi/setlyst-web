import type { FormEvent } from "react";

/**
 * `onSubmit` handler that passes the form's data to `handler`.
 *
 * Use this instead of `<form action={fn}>` for client-side handlers:
 * React 19 resets a form after its `action` runs, so when saving fails
 * (a validation error, a lost connection) every uncontrolled field would
 * snap back to its default and the person's input would be lost.
 * `onSubmit` never resets anything.
 */
export function onFormSubmit(handler: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
  };
}

/** Field id → translated message, for the inline errors of a form. */
export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** The id of the inline error message rendered under field `id`. */
export function errorIdFor(id: string): string {
  return `${id}-error`;
}

/**
 * ARIA wiring for a field that may have an inline error: `aria-invalid` and
 * `aria-describedby` pointing at the message (plus any hint ids).
 */
export function fieldA11y(
  id: string,
  error: string | null | undefined,
  ...describedBy: (string | null | undefined | false)[]
): {
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
} {
  const ids = [error ? errorIdFor(id) : null, ...describedBy].filter(
    (value): value is string => Boolean(value),
  );
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": ids.length > 0 ? ids.join(" ") : undefined,
  };
}

/**
 * Moves focus to the first field of `order` that has an error. Deferred a
 * frame so a tab switched to reveal the field has rendered it first.
 */
export function focusFirstError<K extends string>(
  errors: FieldErrors<K>,
  order: readonly { key: K; id: string | readonly string[] }[],
): void {
  const first = order.find(({ key }) => errors[key]);
  if (!first) return;
  // Several ids: the field can take different shapes (the first that is on
  // screen wins).
  const ids = typeof first.id === "string" ? [first.id] : first.id;
  requestAnimationFrame(() => {
    const el = ids
      .map((id) => document.getElementById(id))
      .find((candidate) => candidate !== null);
    if (el instanceof HTMLElement) {
      el.focus();
      if ("select" in el && typeof el.select === "function") {
        (el as HTMLInputElement).select();
      }
    }
  });
}
