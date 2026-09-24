import { safeReturnPath } from "./return-path";

// Email sign-in without PKCE: both the emailed code and the emailed link's token hash are verified on the
// server, so sign-in works in whichever browser or device opens the email.

// Supabase email codes are 6–10 digits (6 by default). Spaces from copy/paste are ignored.
export function parseEmailCode(raw: unknown) {
  const code = typeof raw === "string" ? raw.replace(/\s+/g, "") : "";
  return /^\d{6,10}$/.test(code) ? code : null;
}

// Token hashes are opaque hex-like strings; bound them so junk never reaches the auth API.
export function parseTokenHash(raw: unknown) {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{16,256}$/.test(raw) ? raw : null;
}

// Only email sign-in/sign-up links are accepted here; recovery, invite and email-change flows are not used.
export function parseEmailLinkType(raw: unknown) {
  return raw === "email" || raw === "magiclink" || raw === "signup" ? "email" as const : null;
}

// The email template passes back the redirect URL the app requested (`.../auth/confirm?next=/dishes/...`).
// Extract only a safe internal path from it, and only when it points at this app's own origin.
export function returnPathFromRedirect(raw: unknown, appOrigin: string) {
  if (typeof raw !== "string" || !raw) return "/";
  try {
    const url = new URL(raw);
    if (url.origin !== appOrigin) return "/";
    return safeReturnPath(url.searchParams.get("next"));
  } catch { return "/"; }
}
