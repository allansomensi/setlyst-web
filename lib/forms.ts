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
