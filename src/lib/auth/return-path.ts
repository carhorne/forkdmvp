export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/";
  // Reject encoded separators too: decoding must never turn an internal path into an origin.
  let decoded = value;
  try {
    for (let i = 0; i < 3; i++) decoded = decodeURIComponent(decoded);
  } catch { return "/"; }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(decoded)) return "/";
  const parsed = new URL(value, "https://forkd.invalid");
  if (parsed.origin !== "https://forkd.invalid" || parsed.pathname.startsWith("/auth/")) return "/";
  return parsed.pathname + parsed.search + parsed.hash;
}
