// DEVELOPMENT-ONLY test accounts for end-to-end checks. Accounts use passwords purely so tests can sign
// in without email; the app itself has no password sign-in. Refuses to run against any other project.
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const DEV_REF = "tvyzezmbyqszscldrqvi";
export const SESSIONS_FILE = "tests/e2e/.auth/sessions.json";
export const TEST_EMAILS = { phone: "forkd-e2e-phone@example.com", desktop: "forkd-e2e-desktop@example.com" } as const;
export type Session = { userId: string; email: string; cookies: { name: string; value: string }[] };

export function devEnv() {
  config({ path: ".env.local", quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (process.env.SEED_TARGET !== "development" || url !== `https://${DEV_REF}.supabase.co`)
    throw new Error("Refusing: end-to-end tests need .env.local pointing at the development project with SEED_TARGET=development");
  const secret = process.env.SUPABASE_SECRET_KEY, pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!secret || !pub) throw new Error("SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required");
  return { url, secret, pub, admin: createClient(url, secret, { auth: { persistSession: false } }) };
}

export async function deleteTestUsers() {
  const { admin } = devEnv();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const users = data.users.filter((u) => (Object.values(TEST_EMAILS) as string[]).includes(u.email ?? ""));
  for (const u of users) { const { error: e } = await admin.auth.admin.deleteUser(u.id); if (e) throw e; } // ratings cascade
  return users.length;
}

// Real @supabase/ssr session cookies, exactly as the app sets them after sign-in.
export async function createSession(email: string): Promise<Session> {
  const { url, pub, admin } = devEnv();
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { purpose: "Forkd e2e test account" } });
  if (error) throw error;
  const jar = new Map<string, string>();
  const ssr = createServerClient(url, pub, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (v) => v.forEach(({ name, value }) => jar.set(name, value)) } });
  const { error: signInError } = await ssr.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { userId: data.user.id, email, cookies: [...jar].map(([name, value]) => ({ name, value })) };
}

// Removes ratings made by the e2e test accounts only (never anyone else's).
export async function deleteTestRatings() {
  const { admin } = devEnv();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const ids = data.users.filter((u) => (Object.values(TEST_EMAILS) as string[]).includes(u.email ?? "")).map((u) => u.id);
  if (!ids.length) return;
  const { error: e } = await admin.from("ratings").delete().in("user_id", ids);
  if (e) throw e;
}
