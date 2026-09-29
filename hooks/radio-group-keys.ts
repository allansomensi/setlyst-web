import type { KeyboardEvent } from "react";

/**
 * Arrow-key behaviour for a `role="radiogroup"` made of `role="radio"`
 * buttons: ←/↑ and →/↓ move to the previous/next enabled option (wrapping
 * round), focus it and select it by clicking it — what assistive tech
 * announces a radio group as supporting. Spread onto the group as
 * `onKeyDown={onRadioGroupKeyDown}`.
 */
export function onRadioGroupKeyDown(event: KeyboardEvent<HTMLElement>) {
  const step =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
  if (!step) return;

  const radios = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "[role=radio]:not(:disabled)",
    ),
  );
  if (radios.length === 0) return;
  event.preventDefault();

  const focused = radios.indexOf(document.activeElement as HTMLElement);
  const checked = radios.findIndex(
    (radio) => radio.getAttribute("aria-checked") === "true",
  );
  const from = focused !== -1 ? focused : checked;
  const next =
    from === -1
      ? radios[step > 0 ? 0 : radios.length - 1]
      : radios[(from + step + radios.length) % radios.length];
  next.focus();
  next.click();
}
