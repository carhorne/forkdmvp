import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createSession, deleteTestUsers, SESSIONS_FILE, TEST_EMAILS } from "./dev-harness";

export default async function globalSetup() {
  await deleteTestUsers(); // leftovers from an interrupted run
  const sessions = { phone: await createSession(TEST_EMAILS.phone), desktop: await createSession(TEST_EMAILS.desktop) };
  mkdirSync(dirname(SESSIONS_FILE), { recursive: true });
  writeFileSync(SESSIONS_FILE, JSON.stringify(sessions), { mode: 0o600 });
}
