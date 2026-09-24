import { describe, expect, it } from "vitest";
import { menuHref, parseMenuParams } from "../src/lib/menu-params";

const R = "3f2c1a9e-8b7d-4c6e-9f10-a1b2c3d4e5f6";

describe("restaurant menu URL controls", () => {
  it("defaults everything when absent", () => expect(parseMenuParams({})).toEqual({ q: "", qTooLong: false, category: null, sort: "top", page: 1 }));
  it("reads valid controls", () => expect(parseMenuParams({ q: "  curry ", category: " Mains ", sort: "price", page: "3" }))
    .toEqual({ q: "curry", qTooLong: false, category: "Mains", sort: "price", page: 3 }));
  it.each(["name", "TOP", "", "top;drop", "__proto__", "toString"])("falls back to Top Rated for sort %j", (sort) => expect(parseMenuParams({ sort }).sort).toBe("top"));
  it.each(["0", "-1", "1.5", "abc", "", "01", "1e3", "99999", "202"])("falls back to page 1 for %j", (page) => expect(parseMenuParams({ page }).page).toBe(1));
  it("accepts the last page the database allows", () => expect(parseMenuParams({ page: "201" }).page).toBe(201));
  it("treats blank or overlong categories as All", () => {
    expect(parseMenuParams({ category: "   " }).category).toBeNull();
    expect(parseMenuParams({ category: "x".repeat(81) }).category).toBeNull();
  });
  it("flags overlong queries after trimming", () => {
    expect(parseMenuParams({ q: ` ${"a".repeat(100)} ` }).qTooLong).toBe(false);
    expect(parseMenuParams({ q: "a".repeat(101) }).qTooLong).toBe(true);
  });
  it("uses the first value of repeated params", () => expect(parseMenuParams({ sort: ["most", "price"], page: ["2", "3"] })).toMatchObject({ sort: "most", page: 2 }));
  it("builds canonical links that omit defaults", () => {
    expect(menuHref(R, {})).toBe(`/restaurants/${R}`);
    expect(menuHref(R, { q: "", category: null, sort: "top", page: 1 })).toBe(`/restaurants/${R}`);
    expect(menuHref(R, { q: "pad thai", category: "Noodles & Rice", sort: "most", page: 2 }))
      .toBe(`/restaurants/${R}?q=pad+thai&category=Noodles+%26+Rice&sort=most&page=2`);
  });
  it("round-trips through the URL", () => {
    const params = { q: "50% off", category: "Sides", sort: "price" as const, page: 4 };
    const url = new URL(menuHref(R, params), "https://forkd.test");
    expect(parseMenuParams(Object.fromEntries(url.searchParams))).toEqual({ ...params, qTooLong: false });
  });
});
