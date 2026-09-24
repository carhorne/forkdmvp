"use server";
import { redirect } from "next/navigation";
import { parseEmailLinkType, parseTokenHash } from "@/lib/auth/otp";
import { safeReturnPath } from "@/lib/auth/return-path";
import { createClient } from "@/lib/supabase/server";

// Verifies the emailed link's token hash on the server. No PKCE verifier cookie is involved, so the
// link works in any browser, including mail apps' in-app browsers and other devices.
export async function confirmSignIn(form: FormData) {
  const next = safeReturnPath(form.get("next"));
  const tokenHash = parseTokenHash(form.get("token_hash"));
  const type = parseEmailLinkType(form.get("type"));
  const failed = `/login?error=link&next=${encodeURIComponent(next)}`;
  if (!tokenHash || !type) redirect(failed);
  let ok = false;
  try {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } catch { /* Falls through to the recoverable login error. */ }
  redirect(ok ? next : failed);
}
