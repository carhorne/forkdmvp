// DEVELOPMENT-ONLY fixture: one clearly labelled 120-dish test restaurant with test-account ratings,
// for checking paging (D4) and sort orders on hosted development data. Never run against production.
//   npm run fixture:dev -- create  --project-ref <development ref>
//   npm run fixture:dev -- cleanup --project-ref <development ref>
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { "project-ref": { type: "string" }, "env-file": { type: "string", default: ".env.local" } } });
config({ path: values["env-file"], override: true, quiet: true });
const ref = values["project-ref"];
if (!ref || process.env.SEED_TARGET !== "development" || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") !== `https://${ref}.supabase.co`)
  throw new Error("Refusing: requires --project-ref matching NEXT_PUBLIC_SUPABASE_URL and SEED_TARGET=development");
const secret = process.env.SUPABASE_SECRET_KEY;
if (!secret) throw new Error("SUPABASE_SECRET_KEY is required");
const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, { auth: { persistSession: false } });

const SEED_KEY = "forkd-dev-fixture-test-kitchen";
const EMAILS = ["a", "b", "c"].map((x) => `forkd-dev-fixture-${x}@example.com`);
const SOURCE = "https://forkd.invalid/development-fixture";
const CATEGORIES = ["Mains", "Sides", "Drinks", "Desserts"];
const dishes = Array.from({ length: 120 }, (_, i) => ({
  seed_key: `fixture-${i}`, slug: `fixture-${i}`,
  // Dish 001 has deliberately long text for 320 px layout checks.
  name: i === 0 ? "Test dish 001 with an intentionally very long name: slow-braised heirloom something with a second clause that keeps going to check wrapping" : `Test dish ${String(i + 1).padStart(3, "0")}`,
  category: CATEGORIES[i % CATEGORIES.length],
  description: i === 0 ? `Spicy development fixture dish. ${"A long description sentence for layout checks. ".repeat(8).trim()}` : i % 10 === 0 ? "Spicy development fixture dish" : null,
  price_cents: i % 7 === 0 ? null : 500 + ((i * 37) % 13) * 100,
  currency: "USD",
}));
const scores = (i: number) => Array.from({ length: i % 4 === 3 ? 0 : i % 4 }, (_, j) => (10 + ((i * 13 + j * 29) % 91)) / 10);

async function fixtureUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.filter((u) => EMAILS.includes(u.email ?? ""));
}

async function create() {
  const restaurant = { seed_key: SEED_KEY, slug: SEED_KEY, name: "Forkd Test Kitchen — development fixture with a deliberately long restaurant name for layout checks", address: "Not a real restaurant",
    city: "Provo", region: "UT", country: "US", cuisine: "Development fixture", menu_source_url: SOURCE, source_checked_at: new Date().toISOString(), menu_coverage: "selected", is_active: true };
  const withSource = dishes.map((d) => ({ ...d, source_url: SOURCE, source_checked_at: restaurant.source_checked_at, is_active: true }));
  // The importer accepts ≤100 dishes per call and preserves omitted dishes.
  for (const menu of [withSource.slice(0, 100), withSource.slice(100)]) {
    const { error } = await admin.rpc("import_restaurant", { p_data: { ...restaurant, menu }, p_dry_run: false });
    if (error) throw error;
  }
  const existing = await fixtureUsers();
  const users: string[] = [];
  for (const email of EMAILS) {
    const found = existing.find((u) => u.email === email);
    if (found) { users.push(found.id); continue; }
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { purpose: "Forkd development fixture" } });
    if (error) throw error;
    users.push(data.user.id);
  }
  const id = await restaurantId();
  if (!id) throw new Error("Fixture restaurant missing after import");
  const { data: rows, error } = await admin.from("dishes").select("id,seed_key").eq("restaurant_id", id).limit(200);
  if (error) throw error;
  const ids = new Map(rows.map((r) => [r.seed_key, r.id]));
  const ratings = dishes.flatMap((d, i) => scores(i).map((score, j) => ({ user_id: users[j], dish_id: ids.get(d.seed_key)!, score })));
  const { error: rateError } = await admin.from("ratings").upsert(ratings, { onConflict: "user_id,dish_id" });
  if (rateError) throw rateError;
  console.log(`Fixture ready: 120 dishes, ${ratings.length} test ratings. Restaurant: /restaurants/${id}`);
}

async function restaurantId() {
  const { data, error } = await admin.from("restaurants").select("id").eq("seed_key", SEED_KEY).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function cleanup() {
  const id = await restaurantId();
  if (id) {
    const { data: rows, error } = await admin.from("dishes").select("id").eq("restaurant_id", id).limit(200);
    if (error) throw error;
    const dishIds = rows.map((r) => r.id);
    for (const [table, column, value] of [["ratings", "dish_id", dishIds], ["dishes", "id", dishIds]] as const) {
      const { error: e } = await admin.from(table).delete().in(column, value);
      if (e) throw e;
    }
    const { error: e } = await admin.from("restaurants").delete().eq("id", id);
    if (e) throw e;
  }
  const users = await fixtureUsers();
  for (const u of users) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) throw error;
  }
  console.log(`Fixture removed (restaurant ${id ? "deleted" : "absent"}, ${users.length} test accounts deleted).`);
}

const command = positionals[0];
if (command === "create") await create();
else if (command === "cleanup") await cleanup();
else throw new Error("Usage: create | cleanup");
