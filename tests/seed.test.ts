import { describe, expect, it } from "vitest";
import { validateSeed } from "../scripts/seed/schema";

export const fixture = {
  seed_key: "test-location", name: "Test location", slug: "test-location", address: "Test address", city: "Test city", region: "UT", country: "US",
  menu_source_url: "https://restaurant.test/menu", source_checked_at: "2026-01-01T00:00:00Z", menu_coverage: "selected",
  menu: [{ seed_key: "test-dish", name: "Test dish", slug: "test-dish", category: "Entrees", price_cents: 1200, currency: "USD" }],
};
describe("seed input validation (isolated fixtures only)", () => {
  it("normalizes inherited provenance and unknown optional fields", () => {
    const [r] = validateSeed([fixture]); expect(r.menu[0].source_url).toBe(fixture.menu_source_url); expect(r.image_path).toBeNull();
  });
  it.each([-1, 10.5, NaN, Infinity])("rejects invalid cents %s", (price_cents) => expect(() => validateSeed([{ ...fixture, menu: [{ ...fixture.menu[0], price_cents }] }])).toThrow());
  it.each(["ZZZ", "usd", "JPY"])("rejects unsupported currencies %s", (currency) => expect(() => validateSeed([{ ...fixture, menu: [{ ...fixture.menu[0], currency }] }])).toThrow());
  it("rejects duplicate identities before importing", () => expect(() => validateSeed([fixture, fixture])).toThrow(/Duplicate/));
  it("rejects duplicate dish keys", () => expect(() => validateSeed([{ ...fixture, menu: [fixture.menu[0], fixture.menu[0]] }])).toThrow(/Duplicate/));
  it("rejects missing categories and mixed currencies", () => {
    expect(() => validateSeed([{ ...fixture, menu: [{ ...fixture.menu[0], category: " " }] }])).toThrow();
    expect(() => validateSeed([{ ...fixture, menu: [...fixture.menu, { ...fixture.menu[0], seed_key: "second", slug: "second", currency: "EUR" }] }])).toThrow(/Mixed/);
  });
  it("rejects invalid sources, dates, unknown fields and fictional markers", () => {
    for (const change of [{ menu_source_url: "javascript:alert(1)" }, { source_checked_at: "bad" }, { source_checked_at: "2099-01-01T00:00:00Z" }, { ratings: [10] }, { name: "EXAMPLE ONLY" }]) expect(() => validateSeed([{ ...fixture, ...change }])).toThrow();
  });
});
