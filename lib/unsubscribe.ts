/** Shape of the unsubscribe tokens the API issues (base64url, bounded). */
export function isPlausibleUnsubscribeToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length >= 10 &&
    token.length <= 200 &&
    /^[A-Za-z0-9_\-.=]+$/.test(token)
  );
}
