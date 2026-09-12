/** Where users land after auth when no valid `next` target is present. */
export const DEFAULT_POST_AUTH_PATH = "/app/dashboard";

/**
 * Resolve a `?next=` value to a safe in-app path.
 *
 * Only relative, same-site paths are allowed — anything else (protocol-relative
 * `//evil.com`, absolute URLs, or empty) falls back to the dashboard, so `next`
 * can never be used as an open redirect.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_POST_AUTH_PATH;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_POST_AUTH_PATH;
  return value;
}
