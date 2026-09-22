"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, publicEnv } from "@/lib/env";
import { safeReturnPath } from "@/lib/auth/return-path";

export type LoginState = { status: "idle" | "sent" | "error"; message: string };
export async function requestMagicLink(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = z.email().max(254).safeParse(form.get("email"));
  if (!email.success) return { status: "error", message: "Enter a valid email address." };
  if (!publicEnv()) return { status: "error", message: "Sign-in isn’t available yet. Please try again later. You can still browse." };
  try {
    const callback = new URL("/auth/callback", appOrigin());
    callback.searchParams.set("next", safeReturnPath(form.get("next")));
    const client = await createClient();
    const { error } = await client.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: callback.href } });
    if (error) return { status: "error", message: "We couldn’t send your link. Check your address and try again in a moment." };
    return { status: "sent", message: "Check your inbox for a sign-in link. Open it in this browser. If it doesn’t arrive, check spam or request another link below." };
  } catch { return { status: "error", message: "We couldn’t reach sign-in. Please try again in a moment." }; }
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) redirect("/login?error=signout");
  redirect("/");
}
