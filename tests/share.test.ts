import { afterEach, describe, expect, it, vi } from "vitest";
import { configuredOrigin, dishShare, pageMetadata, ratingShare, restaurantShare } from "../src/lib/share";

const PROD = "https://forkdmvp.vercel.app";
const R = { id: "d819c69d-5616-460e-a26b-934211322ae2", name: "Bombay House", address: "463 N University Ave", city: "Provo" };
const D = { id: "69c3a692-5859-4a55-81e5-c91e81f08028", name: "Saag Paneer", restaurant_name: "Bombay House" };
const RATING = { id: "8dc5a80b-56df-420c-a392-782091b37c88", score: 7.5, dish_name: "Saag Paneer", restaurant_name: "Bombay House", updated_at: "2026-09-23T18:00:00Z" };

afterEach(() => vi.unstubAllEnvs());

describe("share targets (S1, S2)", () => {
  it("restaurant: name, invitation and canonical production URL", () => expect(restaurantShare(R, PROD)).toEqual({
    url: `${PROD}/restaurants/${R.id}`, title: "Bombay House on Forkd", text: "See what to order at Bombay House (463 N University Ave, Provo) on Forkd." }));
  it("dish: community score and count when rated", () => expect(dishShare({ ...D, average_score: 8.75, rating_count: 2 }, PROD)).toEqual({
    url: `${PROD}/dishes/${D.id}`, title: "Saag Paneer at Bombay House", text: "Saag Paneer at Bombay House: 8.8/10 from 2 ratings on Forkd." }));
  it("dish: honest wording when unrated, never 0/10", () => {
    const t = dishShare({ ...D, average_score: null, rating_count: 0 }, PROD)!;
    expect(t.text).toBe("Saag Paneer at Bombay House on Forkd. No ratings yet.");
    expect(t.text).not.toMatch(/0\/10|0\.0/);
  });
  it("rating: the individual saved score and the rating URL, never the community score", () => {
    const t = ratingShare(RATING, PROD)!;
    expect(t).toEqual({ url: `${PROD}/ratings/${RATING.id}`, title: "A 7.5/10 rating of Saag Paneer", text: "I rated Saag Paneer at Bombay House 7.5/10 on Forkd." });
    expect(ratingShare({ ...RATING, score: "10" }, PROD)!.text).toContain("10.0/10");
  });
  it("uses APP_URL and hides sharing when no origin is configured", () => {
    vi.stubEnv("APP_URL", PROD);
    expect(configuredOrigin()).toBe(PROD);
    expect(restaurantShare(R)!.url).toBe(`${PROD}/restaurants/${R.id}`);
    vi.stubEnv("APP_URL", "");
    expect(configuredOrigin()).toBeNull();
    expect(restaurantShare(R)).toBeNull();
  });
  it("refuses a non-HTTPS non-local origin", () => {
    vi.stubEnv("APP_URL", "http://forkdmvp.vercel.app");
    expect(configuredOrigin()).toBeNull();
  });
});

describe("page metadata (S4)", () => {
  it("has title, description, canonical path and Open Graph fields", () => expect(pageMetadata({ title: "A 7.5/10 rating of Saag Paneer", description: "An individual rating.", path: "/ratings/x" })).toEqual({
    title: "A 7.5/10 rating of Saag Paneer — Forkd", description: "An individual rating.", alternates: { canonical: "/ratings/x" },
    openGraph: { title: "A 7.5/10 rating of Saag Paneer", description: "An individual rating.", url: "/ratings/x", siteName: "Forkd", type: "website" },
    twitter: { card: "summary", title: "A 7.5/10 rating of Saag Paneer", description: "An individual rating." } }));
});
