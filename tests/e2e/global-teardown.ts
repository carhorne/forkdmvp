import { rmSync } from "node:fs";
import { deleteTestUsers, SESSIONS_FILE } from "./dev-harness";

export default async function globalTeardown() {
  await deleteTestUsers();
  rmSync(SESSIONS_FILE, { force: true });
}
