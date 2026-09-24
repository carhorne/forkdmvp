import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSeed } from "../scripts/seed/schema";
import { A, B, migratedDb } from "./db-helpers";

const C = "00000000-0000-4000-8000-000000000003";
const USERS = [A, B, C];
const base = { name: "Discovery test location", address: "Test address", city: "Test city", region: "UT", country: "US",
  menu_source_url: "https://restaurant.test/menu", source_checked_at: "2026-01-01T00:00:00Z", menu_coverage: "selected" as const };

// 120 dishes: paired duplicate names (ID tiebreak), tied prices, unknown prices, 0–2 ratings, repeated averages.
const dishes = Array.from({ length: 120 }, (_, i) => ({
  seed_key: `d${i}`, slug: `d${i}`,
  name: `Dish ${String(Math.floor(i / 2)).padStart(3, "0")}`,
  category: ["Mains", "Sides", "Drinks"][i % 3],
  description: i === 7 ? "Now 50% off" : i % 10 === 0 ? "Very SPICY house special" : null,
  price_cents: i % 7 === 0 ? null : 500 + ((i * 37) % 13) * 100,
  currency: "USD",
  ratings: Array.from({ length: i % 4 === 3 ? 0 : i % 3 }, (_, j) => 10 + ((i * 13 + j * 29) % 91)), // tenths
}));
const RETIRED = "d1";

type Row = { id: string; name: string; category: string; description: string | null; price_cents: number | null; average_score: string | null; rating_count: string | number; total_count: string | number };
let db: PGlite; let restaurant: string;
const ids: Record<string, string> = {};

const page = async (args: { query?: string | null; category?: string | null; sort?: string; limit?: number; offset?: number }) => {
  await db.exec("set role anon");
  try {
    return (await db.query<Row>("select * from public.menu_page($1, $2, $3, $4, $5, $6)",
      [restaurant, args.query ?? null, args.category ?? null, args.sort ?? "top", args.limit ?? 50, args.offset ?? 0])).rows;
  } finally { await db.exec("reset role"); }
};
const allPages = async (args: Parameters<typeof page>[0]) => {
  const out: Row[] = [];
  for (let offset = 0; ; offset += 50) { const rows = await page({ ...args, offset }); out.push(...rows); if (rows.length < 50) return out; }
};

// Independent expected order, using exact integer arithmetic for averages.
type Stat = { id: string; name: string; price: number | null; sum: number; n: number };
const avgDesc = (a: Stat, b: Stat) => (a.n === 0 && b.n === 0) ? 0 : a.n === 0 ? 1 : b.n === 0 ? -1 : Math.sign(b.sum * a.n - a.sum * b.n);
const countDesc = (a: Stat, b: Stat) => b.n - a.n;
const priceAsc = (a: Stat, b: Stat) => (a.price === b.price) ? 0 : a.price === null ? 1 : b.price === null ? -1 : a.price - b.price;
const text = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
const tail = (a: Stat, b: Stat) => text(a.name, b.name) || text(a.id, b.id);
const ORDER = {
  top: (a: Stat, b: Stat) => avgDesc(a, b) || countDesc(a, b) || tail(a, b),
  most: (a: Stat, b: Stat) => countDesc(a, b) || avgDesc(a, b) || tail(a, b),
  price: (a: Stat, b: Stat) => priceAsc(a, b) || tail(a, b),
};
const expected = (sort: keyof typeof ORDER, keep: (d: (typeof dishes)[number]) => boolean = () => true) =>
  dishes.filter((d) => d.seed_key !== RETIRED && keep(d))
    .map((d) => ({ id: ids[d.seed_key], name: d.name, price: d.price_cents, sum: d.ratings.reduce((s, x) => s + x, 0), n: d.ratings.length }))
    .sort(ORDER[sort]).map((s) => s.id);

describe("menu_page discovery RPC (D1–D4)", () => {
  beforeAll(async () => {
    db = await migratedDb([C]);
    const menu = dishes.map((d) => ({ seed_key: d.seed_key, slug: d.slug, name: d.name, category: d.category, description: d.description, price_cents: d.price_cents, currency: d.currency }));
    const imp = (data: unknown) => db.query("select public.import_restaurant($1::jsonb, false)", [JSON.stringify(data)]);
    // The importer accepts ≤100 dishes per call and preserves omitted dishes, so import in two batches.
    await imp(validateSeed([{ ...base, seed_key: "discovery", slug: "discovery", menu: menu.slice(0, 100) }])[0]);
    await imp(validateSeed([{ ...base, seed_key: "discovery", slug: "discovery", menu: [...menu.slice(100), { ...menu[1], is_active: false }] }])[0]);
    await imp(validateSeed([{ ...base, seed_key: "other", slug: "other", name: "Other location", menu: [{ seed_key: "o1", slug: "o1", name: "Spicy other dish", category: "Mains", price_cents: 100, currency: "USD" }] }])[0]);
    restaurant = (await db.query<{ id: string }>("select id from public.restaurants where seed_key='discovery'")).rows[0].id;
    for (const r of (await db.query<{ id: string; seed_key: string }>("select id, seed_key from public.dishes where restaurant_id=$1", [restaurant])).rows) ids[r.seed_key] = r.id;
    for (const d of dishes) for (const [j, score] of d.ratings.entries())
      await db.query("insert into public.ratings(user_id, dish_id, score) values ($1, $2, $3)", [USERS[j], ids[d.seed_key], score / 10]);
  }, 120000);
  afterAll(async () => { await db?.close(); });

  it.each(["top", "most", "price"] as const)("%s order is exact across 50-item page boundaries", async (sort) => {
    const pages = [await page({ sort, offset: 0 }), await page({ sort, offset: 50 }), await page({ sort, offset: 100 })];
    expect(pages.map((p) => p.length)).toEqual([50, 50, 19]);
    expect(pages.flat().map((r) => r.id)).toEqual(expected(sort));
    expect(pages.flat().every((r) => Number(r.total_count) === 119)).toBe(true);
    expect(await page({ sort, offset: 150 })).toEqual([]);
  });

  it("puts unrated dishes last with null average and zero count, and unknown prices last", async () => {
    const top = await allPages({ sort: "top" });
    const firstUnrated = top.findIndex((r) => r.average_score === null);
    expect(firstUnrated).toBeGreaterThan(0);
    expect(top.slice(firstUnrated).every((r) => r.average_score === null && Number(r.rating_count) === 0)).toBe(true);
    const price = await allPages({ sort: "price" });
    const firstUnknown = price.findIndex((r) => r.price_cents === null);
    expect(price.slice(firstUnknown).every((r) => r.price_cents === null)).toBe(true);
  });

  it("searches names and descriptions within this restaurant only, ignoring case and outer whitespace", async () => {
    const spicy = expected("top", (d) => /spicy/i.test(d.description ?? "") || /spicy/i.test(d.name));
    expect(spicy.length).toBeGreaterThan(0);
    expect((await allPages({ query: "spicy" })).map((r) => r.id)).toEqual(spicy);
    expect((await allPages({ query: "   sPiCy  " })).map((r) => r.id)).toEqual(spicy);
    expect((await allPages({ query: "Dish 010" })).map((r) => r.name)).toEqual(["Dish 010", "Dish 010"]);
    expect(await page({ query: "no such dish" })).toEqual([]);
    expect((await allPages({ query: "   " })).length).toBe(119);
  });

  it("treats wildcards literally", async () => {
    expect((await allPages({ query: "%" })).map((r) => r.id)).toEqual([ids.d7]);
    expect(await page({ query: "_" })).toEqual([]);
  });

  it("combines category AND query on the same list, with correct totals", async () => {
    const both = await allPages({ query: "spicy", category: "Sides", sort: "price" });
    expect(both.map((r) => r.id)).toEqual(expected("price", (d) => d.category === "Sides" && /spicy/i.test(d.description ?? "")));
    expect(both.every((r) => r.category === "Sides")).toBe(true);
    const sides = await page({ category: "Sides", sort: "most", offset: 0 });
    expect(Number(sides[0].total_count)).toBe(expected("most", (d) => d.category === "Sides").length);
    expect(await page({ category: "No such category" })).toEqual([]);
  });

  it("excludes retired dishes", async () => expect((await allPages({})).map((r) => r.id)).not.toContain(ids[RETIRED]));

  it("rejects unknown sorts and out-of-range inputs", async () => {
    for (const bad of [{ sort: "name" }, { sort: "top; drop table public.dishes" }, { limit: 51 }, { limit: 0 }, { offset: -1 },
      { query: "x".repeat(101) }, { category: "x".repeat(81) }]) await expect(page(bad)).rejects.toThrow();
    await expect(page({ query: ` ${"x".repeat(100)} ` })).resolves.toEqual([]);
    await db.exec("set role anon");
    await expect(db.query("select * from public.menu_page($1, null, null, null)", [restaurant])).rejects.toThrow();
    await db.exec("reset role");
  });

  it("returns no identity fields", async () => {
    const [row] = await page({});
    expect(Object.keys(row).filter((k) => /user|email|token/i.test(k))).toEqual([]);
  });
});
