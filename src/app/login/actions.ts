"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, publicEnv } from "@/lib/env";
import { parseEmailCode } from "@/lib/auth/otp";
import { safeReturnPath } from "@/lib/auth/return-path";

export type LoginState =
  | { status: "idle"; message: "" }
  | { status: "sent"; email: string; message: string }
  | { status: "error"; message: string; email?: string };

type AuthError = { status?: number; code?: string } | null;
// Supabase's reason, in plain language. Never echo raw auth errors or tokens.
function requestError(error: AuthError) {
  if (error?.status === 429 || error?.code?.startsWith("over_")) return "Too many sign-in emails were requested just now. Please wait a minute and try again.";
  if (error?.code === "email_address_invalid") return "That email address can’t receive sign-in emails. Check it and try again.";
  return "We couldn’t send your sign-in email. Please try again in a moment.";
}

// Sends one email containing both a code and a link. Both are verified on the server
// (no PKCE verifier cookie), so they work in whichever browser or device opens the email.
export async function requestSignIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().max(254).safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { status: "error", message: "Enter a valid email address." };
  if (!publicEnv()) return { status: "error", message: "Sign-in isn’t available yet. Please try again later. You can still browse." };
  try {
    const confirm = new URL("/auth/confirm", appOrigin());
    confirm.searchParams.set("next", safeReturnPath(form.get("next")));
    const client = await createClient();
    const { error } = await client.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: confirm.href } });
    if (error) return { status: "error", message: requestError(error), email: email.data };
    return { status: "sent", email: email.data, message: `We emailed a sign-in code and link to ${email.data}. Enter the code below, or tap the link in the email on any device.` };
  } catch { return { status: "error", message: "We couldn’t reach sign-in. Please try again in a moment.", email: email.data }; }
}

export type CodeState = { status: "idle" | "error"; message: string };

export async function verifyCode(_previous: CodeState, form: FormData): Promise<CodeState> {
  const email = z.email().max(254).safeParse(String(form.get("email") ?? "").trim());
  const code = parseEmailCode(form.get("code"));
  if (!email.success) return { status: "error", message: "Request a new code with your email address." };
  if (!code) return { status: "error", message: "Enter the code from the email." };
  const next = safeReturnPath(form.get("next"));
  try {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({ email: email.data, token: code, type: "email" });
    if (error) {
      if (error.status === 429 || error.code?.startsWith("over_")) return { status: "error", message: "Too many attempts. Please wait a minute and try again." };
      return { status: "error", message: "That code is incorrect or has expired. Check the latest email, or request a new code." };
    }
  } catch { return { status: "error", message: "We couldn’t reach sign-in. Please try again in a moment." }; }
  redirect(next);
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) redirect("/login?error=signout");
  redirect("/");
}
