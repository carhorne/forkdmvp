import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { validateSeed } from "./schema";
import type { Database } from "../../src/lib/supabase/database.types";

async function main() {
  const { values, positionals } = parseArgs({ options: {
    target: { type: "string" }, "project-ref": { type: "string" }, "env-file": { type: "string", default: ".env.local" },
    dir: { type: "string", default: "seed/verified" },
  }, allowPositionals: true });
  const [mode] = positionals;
  if (!["validate", "dry-run", "apply"].includes(mode) || positionals.length !== 1) throw new Error("Choose validate, dry-run, or apply");
  if (!["development", "production"].includes(values.target ?? "")) throw new Error("Explicit --target development|production is required");
  const dir = path.resolve(values.dir!);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const inputs = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as unknown));
  const seed = validateSeed(inputs); // All input validated before any network call or write.
  if (values.target === "production" && (seed.length < 10 || seed.some((r) => r.menu.length < 10 || r.menu.length > 30))) throw new Error("Production requires 10–20 locations and 10–30 reviewed dishes per location");
  console.info(`Validated ${seed.length} locations, ${seed.reduce((n, r) => n + r.menu.length, 0)} dishes. Target: ${values.target}.`);
  if (mode === "validate") return;
  config({ path: values["env-file"], override: true, quiet: true });
  const project = values["project-ref"];
  if (!project || !/^[a-z]{20}$/.test(project)) throw new Error("Explicit --project-ref (20 lowercase letters) is required");
  const expected = `https://${project}.supabase.co`;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") !== expected) throw new Error("Environment project URL does not match --project-ref");
  if (process.env.SEED_TARGET !== values.target) throw new Error("Set SEED_TARGET in the selected environment file to match --target");
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Local administrative seed key is missing");
  const client = createClient<Database>(expected, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  console.info(`${mode} on ${values.target} project ${project}`);
  for (const r of seed) {
    const { data, error } = await client.rpc("import_restaurant", { p_data: r, p_dry_run: mode === "dry-run" });
    if (error) throw new Error(`Import stopped for ${r.seed_key} (database code ${error.code}); that restaurant transaction rolled back. Earlier completed restaurants remain applied. Fix input and rerun.`);
    console.info(r.seed_key, data);
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Seed operation failed"); process.exitCode = 1; });
