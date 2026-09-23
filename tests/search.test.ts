import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import { escapeLike, isUuid, MAX_QUERY_LENGTH, parseRestaurantQuery } from "../src/lib/search";

describe("restaurant search query", () => {
  it.each([undefined, "", "   ", "\n\t", [""]])("treats %j as list-all", (raw) => expect(parseRestaurantQuery(raw)).toEqual({ kind: "all", text: "" }));
  it("trims and builds a substring pattern", () => expect(parseRestaurantQuery("  ThAi ")).toEqual({ kind: "name", text: "ThAi", pattern: "%ThAi%" }));
  it("uses the first value of a repeated param", () => expect(parseRestaurantQuery(["mozz", "x"])).toMatchObject({ text: "mozz" }));
  it("accepts exactly 100 characters and rejects 101", () => {
    expect(parseRestaurantQuery("a".repeat(MAX_QUERY_LENGTH)).kind).toBe("name");
    expect(parseRestaurantQuery("a".repeat(MAX_QUERY_LENGTH + 1)).kind).toBe("too-long");
  });
  it("measures length after trimming", () => expect(parseRestaurantQuery(` ${"a".repeat(MAX_QUERY_LENGTH)} `).kind).toBe("name"));
  it("escapes LIKE wildcards and backslashes", () => expect(escapeLike(String.raw`50%_off\x`)).toBe(String.raw`50\%\_off\\x`));
  it("recognizes only canonical UUIDs", () => {
    expect(isUuid("3f2c1a9e-8b7d-4c6e-9f10-a1b2c3d4e5f6")).toBe(true);
    for (const bad of ["", "123", "3f2c1a9e8b7d4c6e9f10a1b2c3d4e5f6", "3f2c1a9e-8b7d-4c6e-9f10-a1b2c3d4e5f6x", "../x"]) expect(isUuid(bad)).toBe(false);
  });
});

describe("escaped patterns on PostgreSQL ILIKE", () => {
  const db = new PGlite();
  afterAll(() => db.close());
  const matches = async (name: string, raw: string) => {
    const q = parseRestaurantQuery(raw);
    if (q.kind !== "name") throw new Error("expected name query");
    return (await db.query<{ m: boolean }>("select $1 ilike $2 as m", [name, q.pattern])).rows[0].m;
  };
  it("matches partial and mixed-case names", async () => {
    expect(await matches("Bombay House", "bomb")).toBe(true);
    expect(await matches("Silver Dish Thai Cuisine", "THAI")).toBe(true);
    expect(await matches("Station 22", "pad thai")).toBe(false);
  });
  it("treats wildcards as literal text", async () => {
    expect(await matches("Bombay House", "%")).toBe(false);
    expect(await matches("Bombay House", "_")).toBe(false);
    expect(await matches("Fat Daddy's Pizzeria", "daddy's")).toBe(true);
    expect(await matches("100% Local", "0%")).toBe(true);
    expect(await matches(String.raw`A\B`, "\\")).toBe(true);
  });
});
