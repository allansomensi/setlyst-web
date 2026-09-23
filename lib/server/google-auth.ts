import "server-only";

/**
 * Whether "Continue with Google" is offered: both OAuth credentials must
 * be configured (the client secret never leaves the server; pages only
 * receive this boolean). The API must also list the same client id in
 * `GOOGLE_CLIENT_IDS`, otherwise it answers `GOOGLE_SIGNIN_DISABLED`.
 */
export function isGoogleSignInEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
