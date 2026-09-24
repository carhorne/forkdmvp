import { describe, expect, it } from "vitest";
import { parseScore } from "../src/lib/score";

describe("rating score validation (T2)", () => {
  it.each([["1.0", "1.0"], ["1", "1.0"], ["9.2", "9.2"], ["10", "10.0"], ["10.0", "10.0"], [" 7.5 ", "7.5"], ["5", "5.0"]])("accepts %j as %s", (raw, value) =>
    expect(parseScore(raw)).toEqual({ ok: true, value }));
  it.each(["0", "0.9", "10.1", "11", "9.25", "9.20", "NaN", "Infinity", "-1", "", "   ", "abc", "8,5", "1e1", ".5", "5.", "+5", "0x5", "05", "９"])("rejects %j", (raw) =>
    expect(parseScore(raw).ok).toBe(false));
  it.each([null, undefined, 9.2, ["9.2"], {}])("rejects non-string %j", (raw) => expect(parseScore(raw).ok).toBe(false));
});
