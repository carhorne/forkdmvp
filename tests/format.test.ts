import { describe, expect, it } from "vitest";
import { formatCheckedDate, formatPrice, formatRatingCount, formatScore } from "../src/lib/format";

describe("menu display formatting", () => {
  it("shows averages to one decimal", () => {
    expect(formatScore(9)).toBe("9.0");
    expect(formatScore("9.0000000000000000")).toBe("9.0");
    expect(formatScore(10)).toBe("10.0");
    expect(formatScore(1)).toBe("1.0");
  });
  it("rounds half up, including values that are inexact in binary", () => {
    expect(formatScore(8.25)).toBe("8.3");
    expect(formatScore(8.35)).toBe("8.4");
    expect(formatScore("7.6666666666666667")).toBe("7.7");
    expect(formatScore(9.94)).toBe("9.9");
    expect(formatScore(9.95)).toBe("10.0");
  });
  it("keeps unrated distinct from zero", () => expect(formatScore(null)).toBeNull());
  it("pluralizes counts", () => {
    expect(formatRatingCount(0)).toBe("0 ratings");
    expect(formatRatingCount(1)).toBe("1 rating");
    expect(formatRatingCount("2")).toBe("2 ratings");
  });
  it("formats prices and never shows an unknown price as zero", () => {
    expect(formatPrice(1299, "USD")).toBe("$12.99");
    expect(formatPrice(0, "USD")).toBe("$0.00");
    expect(formatPrice(null, "USD")).toBe("Price unavailable");
  });
  it("formats source dates in UTC", () => expect(formatCheckedDate("2026-09-22T23:30:00Z")).toBe("Sep 22, 2026"));
});
