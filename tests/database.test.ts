import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSeed } from "../scripts/seed/schema";
import { A, B, migratedDb } from "./db-helpers";

const fixture = validateSeed([{
  seed_key: "db-test-location", name: "Database test location", slug: "db-test-location", address: "Test address", city: "Test city", region: "UT", country: "US",
  menu_source_url: "https://restaurant.test/menu", source_checked_at: "2026-01-01T00:00:00Z", menu_coverage: "selected",
  menu: [{ seed_key: "db-test-dish", name: "Database test dish", slug: "db-test-dish", category: "Entrees", price_cents: 1200, currency: "USD" }],
}])[0];
let db: PGlite; let dish: string; let restaurant: string; let rating: string;
async function actor<T>(role: "anon" | "authenticated", user: string | null, run: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  try { return await run(); } finally { await db.exec("reset role"); }
}
const importMenu = (data: unknown, dry = false) => db.query<{ result: Record<string, number | boolean> }>("select public.import_restaurant($1::jsonb, $2) as result", [JSON.stringify(data), dry]);
describe("migrations, RLS and atomic seed import on real PostgreSQL engine", () => {
  beforeAll(async () => {
    db = await migratedDb();
    await importMenu(fixture);
    dish = (await db.query<{ id: string }>("select id from public.dishes")).rows[0].id;
    restaurant = (await db.query<{ id: string }>("select id from public.restaurants")).rows[0].id;
  }, 60000);
  afterAll(async () => { await db?.close(); });
  it("allows public catalog reads but blocks anonymous writes and raw ratings", async () => {
    await actor("anon", null, async () => {
      expect((await db.query("select id from public.restaurants")).rows).toHaveLength(1);
      await expect(db.query("select * from public.ratings")).rejects.toThrow();
      await expect(db.query("insert into public.ratings(user_id,dish_id,score) values ($1,$2,8)", [A, dish])).rejects.toThrow();
      await expect(importMenu(fixture)).rejects.toThrow();
    });
  });
  it("accepts valid tenths and prevents spoofed ownership, bad precision and nonfinite scores", async () => {
    await actor("authenticated", A, async () => {
      await expect(db.query("insert into public.ratings(user_id,dish_id,score) values ($1,$2,8)", [B, dish])).rejects.toThrow();
      for (const score of ["0", "10.1", "9.25", "NaN", "Infinity", "-Infinity"]) await expect(db.query("insert into public.ratings(user_id,dish_id,score) values ($1,$2,$3::numeric)", [A, dish, score])).rejects.toThrow();
      rating = (await db.query<{ id: string }>("insert into public.ratings(user_id,dish_id,score) values ($1,$2,8) returning id", [A, dish])).rows[0].id;
      for (const score of [1, 9.2, 10, 8]) await db.query("update public.ratings set score=$1 where id=$2", [score, rating]);
      await expect(db.query("update public.ratings set user_id=$1 where id=$2", [B, rating])).rejects.toThrow();
      await expect(db.query("update public.ratings set dish_id=$1 where id=$2", [dish, rating])).rejects.toThrow();
      await expect(db.query("delete from public.ratings where id=$1", [rating])).rejects.toThrow();
      await expect(db.query("update public.restaurants set name='Changed' where id=$1", [restaurant])).rejects.toThrow();
    });
  });
  it("user B cannot read or edit user A, while aggregate and saved-score projections hide identity", async () => {
    await actor("authenticated", B, async () => {
      expect((await db.query("select * from public.ratings where id=$1", [rating])).rows).toHaveLength(0);
      expect((await db.query("update public.ratings set score=2 where id=$1 returning id", [rating])).rows).toHaveLength(0);
      await db.query("insert into public.ratings(user_id,dish_id,score) values ($1,$2,10)", [B, dish]);
    });
    await actor("anon", null, async () => {
      const row = (await db.query<{ average_score: string; rating_count: number }>("select * from public.menu_page($1)", [restaurant])).rows[0];
      expect(Number(row.average_score)).toBe(9); expect(Number(row.rating_count)).toBe(2);
      const saved = (await db.query<{ score: string }>("select * from public.public_rating($1)", [rating])).rows[0];
      expect(saved.score).toBe("8"); expect(saved).not.toHaveProperty("user_id"); expect(saved).not.toHaveProperty("email");
      await expect(db.query("select * from public.menu_page($1, null, null, 'top', 51, 0)", [restaurant])).rejects.toThrow();
      const detail = (await db.query<Record<string, unknown>>("select * from public.dish_detail($1)", [dish])).rows[0];
      expect(Number(detail.average_score)).toBe(9); expect(Number(detail.rating_count)).toBe(2);
      expect(detail.restaurant_name).toBe(fixture.name); expect(detail.is_active).toBe(true);
      expect(Object.keys(detail).filter((k) => /user|email|token/i.test(k))).toEqual([]);
      expect((await db.query("select * from public.dish_detail($1)", ["00000000-0000-4000-8000-00000000dead"])).rows).toHaveLength(0);
      await expect(db.query("select * from public.dish_detail(null)")).rejects.toThrow();
    });
  });
  it("enforces one rating per user/dish and reflects edits without stored averages", async () => {
    await actor("authenticated", A, async () => {
      await expect(db.query("insert into public.ratings(user_id,dish_id,score) values ($1,$2,6)", [A, dish])).rejects.toThrow();
      await db.query("update public.ratings set score=6 where id=$1", [rating]);
    });
    const row = (await db.query<{ average_score: string; rating_count: number }>("select * from public.menu_page($1)", [restaurant])).rows[0];
    expect(Number(row.average_score)).toBe(8); expect(Number(row.rating_count)).toBe(2);
  });
  it("dry-run is read-only and repeat applies preserve all IDs, timestamps, counts and ratings", async () => {
    const before = (await db.query("select row_to_json(r) as value from public.restaurants r union all select row_to_json(d) from public.dishes d union all select row_to_json(t) from public.ratings t")).rows;
    expect((await importMenu({ ...fixture, name: "Updated test name" }, true)).rows[0].result.update).toBe(1);
    expect((await importMenu(fixture)).rows[0].result.unchanged).toBe(2);
    await importMenu(fixture);
    expect((await db.query("select row_to_json(r) as value from public.restaurants r union all select row_to_json(d) from public.dishes d union all select row_to_json(t) from public.ratings t")).rows).toEqual(before);
  });
  it("rolls back the whole restaurant on a failing dish and preserves omitted dishes", async () => {
    await expect(importMenu({ ...fixture, name: "Should roll back", menu: [...fixture.menu, { ...fixture.menu[0], seed_key: "bad-dish", slug: "bad-dish", price_cents: -1 }] })).rejects.toThrow();
    expect((await db.query<{ name: string }>("select name from public.restaurants where id=$1", [restaurant])).rows[0].name).toBe(fixture.name);
    expect((await db.query("select * from public.dishes")).rows).toHaveLength(1);
    await importMenu({ ...fixture, menu: [{ ...fixture.menu[0], seed_key: "second-dish", slug: "second-dish" }] });
    expect((await db.query("select * from public.dishes")).rows).toHaveLength(2);
    await expect(importMenu({ ...fixture, slug: "changed-slug" })).rejects.toThrow(/immutable/);
  });
  it("retirement preserves public links and blocks writes to inactive targets", async () => {
    await importMenu({ ...fixture, menu: fixture.menu.map((d) => ({ ...d, is_active: false })) });
    await actor("authenticated", A, async () => expect((await db.query("update public.ratings set score=7 where id=$1 returning id", [rating])).rows).toHaveLength(0));
    await actor("anon", null, async () => {
      expect((await db.query("select * from public.public_rating($1)", [rating])).rows).toHaveLength(1);
      // Retired dishes leave the menu but their links still resolve, flagged inactive, with history intact.
      expect((await db.query<{ id: string }>("select * from public.menu_page($1)", [restaurant])).rows.map((r) => r.id)).not.toContain(dish);
      const retired = (await db.query<{ is_active: boolean; rating_count: number }>("select * from public.dish_detail($1)", [dish])).rows[0];
      expect(retired.is_active).toBe(false); expect(Number(retired.rating_count)).toBe(2);
    });
  });
});

describe("Top Rated menu order (PRODUCT_SPEC.md)", () => {
  let tdb: PGlite;
  afterAll(async () => { await tdb?.close(); });
  it("orders by average desc, count desc, name asc; unrated last with null average and zero count", async () => {
    tdb = await migratedDb();
    const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Aardvark", "Foxtrot"];
    await tdb.query("select public.import_restaurant($1::jsonb, false)", [JSON.stringify({ ...fixture, menu: names.map((name) => ({ ...fixture.menu[0], name, seed_key: name.toLowerCase(), slug: name.toLowerCase() })) })]);
    const scores: Record<string, number[]> = { Alpha: [8, 10], Bravo: [9], Charlie: [9], Delta: [9, 10], Foxtrot: [3] };
    for (const [name, list] of Object.entries(scores)) for (const [i, score] of list.entries())
      await tdb.query("insert into public.ratings(user_id,dish_id,score) select $1, id, $2 from public.dishes where name=$3", [[A, B][i], score, name]);
    const id = (await tdb.query<{ id: string }>("select id from public.restaurants")).rows[0].id;
    await tdb.exec("set role anon");
    const rows = (await tdb.query<{ name: string; average_score: string | null; rating_count: number }>("select * from public.menu_page($1)", [id])).rows;
    await tdb.exec("reset role");
    expect(rows.map((r) => r.name)).toEqual(["Delta", "Alpha", "Bravo", "Charlie", "Foxtrot", "Aardvark", "Echo"]);
    expect(Number(rows[1].average_score)).toBe(9); expect(Number(rows[1].rating_count)).toBe(2);
    expect(rows.at(-1)).toMatchObject({ average_score: null }); expect(Number(rows.at(-1)!.rating_count)).toBe(0);
  }, 60000);
});

describe("retired functions", () => {
  it("restaurant_menu no longer exists (replaced by menu_page)", async () => {
    const fresh = await migratedDb();
    expect((await fresh.query("select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'restaurant_menu'")).rows).toEqual([]);
    await fresh.close();
  }, 60000);
});
