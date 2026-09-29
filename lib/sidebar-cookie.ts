/**
 * The dashboard sidebar's fold state, shared by the client (which writes
 * it when the toggle is pressed) and the dashboard layout (which reads
 * it on the server, so the page is rendered already folded). A plain
 * preference, not a secret: no HttpOnly, and it is fine for it to be
 * missing.
 */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar_collapsed";
/** One year, in seconds. */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
