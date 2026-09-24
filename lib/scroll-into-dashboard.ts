/**
 * Scrolls the dashboard's own scroll area so `target` sits at its top.
 *
 * `Element.scrollIntoView` walks *every* scrollable ancestor, and a box
 * with `overflow: hidden` still counts: once the content area can't scroll
 * any further (the last, short section of a page), the browser scrolls the
 * clipped shell around it instead, pushing the whole dashboard up past the
 * sidebar and leaving an empty band below it. Scrolling the one container
 * that is meant to scroll avoids that.
 */
export const DASHBOARD_SCROLL_ATTR = "data-dashboard-scroll";

export function scrollIntoDashboard(
  target: Element,
  { smooth = false }: { smooth?: boolean } = {},
): void {
  const container = target.closest(`[${DASHBOARD_SCROLL_ATTR}]`);
  if (!(container instanceof HTMLElement)) {
    target.scrollIntoView({ block: "start" });
    return;
  }
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop);
  const top =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop -
    (Number.isFinite(margin) ? margin : 0);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  container.scrollTo({
    top: Math.max(0, top),
    behavior: smooth && !reduce ? "smooth" : "auto",
  });
}
