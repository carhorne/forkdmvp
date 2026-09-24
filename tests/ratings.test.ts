import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSeed } from "../scripts/seed/schema";
import { A, B, migratedDb } from "./db-helpers";

const C = "00000000-0000-4000-8000-000000000003";

const seed = validateSeed([{
  seed_key: "rating-test", name: "Rating test location", slug: "rating-test", address: "Test address", city: "Test city", region: "UT", country: "US",
  menu_source_url: "https://restaurant.test/menu", source_checked_at: "2026-01-01T00:00:00Z", menu_coverage: "selected",
  menu: ["one", "two", "three"].map((k) => ({ seed_key: k, slug: k, name: `Dish ${k}`, category: "Mains", price_cents: 1000, currency: "USD" })),
}])[0];
let db: PGlite; const dish: Record<string, string> = {};

async function as<T>(user: string | null, run: () => Promise<T>) {
  await db.exec(`set role ${user ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  try { return await run(); } finally { await db.exec("reset role"); }
}
const save = (user: string | null, dishId: string, score: string | number | null) =>
  as(user, async () => (await db.query<{ id: string; score: string }>("select * from public.save_rating($1, $2::numeric)", [dishId, score])).rows[0]);
const detail = async (dishId: string) => (await db.query<{ average_score: string | null; rating_count: number }>("select * from public.dish_detail($1)", [dishId])).rows[0];
const rows = async (dishId: string) => (await db.query<{ id: string; user_id: string; score: string }>("select id, user_id, score::text from public.ratings where dish_id=$1 order by user_id", [dishId])).rows;

describe("save_rating RPC (T2–T5)", () => {
  beforeAll(async () => {
    db = await migratedDb([C]);
    await db.query("select public.import_restaurant($1::jsonb, false)", [JSON.stringify(seed)]);
    for (const r of (await db.query<{ id: string; seed_key: string }>("select id, seed_key from public.dishes")).rows) dish[r.seed_key] = r.id;
  }, 60000);
  afterAll(async () => { await db?.close(); });

  it("T5: anonymous callers and sessionless authenticated calls cannot rate", async () => {
    await expect(save(null, dish.one, 8)).rejects.toThrow();
    await db.exec("set role authenticated"); await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await expect(db.query("select * from public.save_rating($1, 8)", [dish.one])).rejects.toThrow(/Sign in/);
    await db.exec("reset role");
    expect(await rows(dish.one)).toEqual([]);
  });

  it("T2: persists 1.0, 9.2 and 10.0 exactly", async () => {
    for (const score of ["1.0", "9.2", "10.0"]) {
      const saved = await save(A, dish.two, score);
      expect(Number(saved.score)).toBe(Number(score));
      expect((await rows(dish.two))[0].score).toBe(score);
    }
  });

  it.each(["0", "10.1", "9.25", "NaN", "Infinity", "-1", null])("T2: rejects %s without rounding", async (score) => {
    const before = await rows(dish.two);
    await expect(save(A, dish.two, score)).rejects.toThrow();
    expect(await rows(dish.two)).toEqual(before);
  });

  it("T3: updating 8.0 to 6.0 with another user's 10.0 moves 9.0 → 8.0, count stays 2, ID stable", async () => {
    const first = await save(A, dish.one, 8);
    await save(B, dish.one, 10);
    expect(Number((await detail(dish.one)).average_score)).toBe(9);
    expect(Number((await detail(dish.one)).rating_count)).toBe(2);
    const updated = await save(A, dish.one, 6);
    expect(updated.id).toBe(first.id);
    expect(Number((await detail(dish.one)).average_score)).toBe(8);
    expect(Number((await detail(dish.one)).rating_count)).toBe(2);
    expect((await rows(dish.one)).map((r) => [r.user_id, r.score])).toEqual([[A, "6"], [B, "10"]]);
  });

  it("T4: repeated and overlapping submissions converge on one row", async () => {
    const ids = await Promise.all(Array.from({ length: 10 }, (_, i) => save(A, dish.three, 5 + i / 10)));
    expect(new Set(ids.map((r) => r.id)).size).toBe(1);
    expect((await rows(dish.three)).filter((r) => r.user_id === A)).toHaveLength(1);
  });

  it("T5: user B cannot read, edit or take over A's rating; save_rating only ever writes the caller's row", async () => {
    const a = (await rows(dish.one)).find((r) => r.user_id === A)!;
    await as(B, async () => {
      expect((await db.query("select * from public.ratings where id=$1", [a.id])).rows).toEqual([]);
      expect((await db.query("update public.ratings set score=1 where id=$1 returning id", [a.id])).rows).toEqual([]);
      await expect(db.query("insert into public.ratings(user_id, dish_id, score) values ($1, $2, 1)", [A, dish.two])).rejects.toThrow();
      await expect(db.query("update public.dishes set name='x' where id=$1", [dish.one])).rejects.toThrow();
    });
    await save(B, dish.one, 3);
    expect((await rows(dish.one)).find((r) => r.user_id === A)!.score).toBe("6");
  });

  it("rejects unknown dishes", async () => {
    await expect(save(A, "00000000-0000-4000-8000-00000000dead", 5)).rejects.toThrow();
  });

  it("blocks creating or editing ratings on retired dishes", async () => {
    await db.query("select public.import_restaurant($1::jsonb, false)", [JSON.stringify({ ...seed, menu: seed.menu.map((d) => d.seed_key === "one" ? { ...d, is_active: false } : d) })]);
    await expect(save(A, dish.one, 7)).rejects.toThrow();
    await expect(save(C, dish.one, 7)).rejects.toThrow(/row-level security/);
    await expect(save(C, dish.two, 7)).resolves.toMatchObject({ score: "7" }); // same user, active dish: allowed
    expect((await rows(dish.one)).map((r) => r.score)).toEqual(["6", "3"]);
  });
});
