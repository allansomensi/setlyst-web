/**
 * Small text-editing helpers for the lyrics editor's toolbar: they edit
 * the textarea value through React state and restore the selection.
 */

export function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  setText: (v: string) => void,
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);
  const replacement = selected
    ? `${prefix}${selected}${suffix}`
    : `${prefix}text${suffix}`;
  const next = value.slice(0, start) + replacement + value.slice(end);
  setText(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const newStart = selected ? start + prefix.length : start + prefix.length;
    const newEnd = selected
      ? end + prefix.length
      : start + prefix.length + "text".length;
    textarea.setSelectionRange(newStart, newEnd);
  });
}

export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  insertion: string,
  setText: (v: string) => void,
  cursorOffset?: number,
) {
  const { selectionStart: start, value } = textarea;
  const next = value.slice(0, start) + insertion + value.slice(start);
  setText(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const pos = start + (cursorOffset ?? insertion.length);
    textarea.setSelectionRange(pos, pos);
  });
}
