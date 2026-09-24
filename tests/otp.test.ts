import { describe, expect, it } from "vitest";
import { parseEmailCode, parseEmailLinkType, parseTokenHash, returnPathFromRedirect } from "../src/lib/auth/otp";

const ORIGIN = "https://forkdmvp.vercel.app";

describe("email code and link validation", () => {
  it.each([["123456", "123456"], [" 123 456 ", "123456"], ["1234567890", "1234567890"]])("accepts code %j", (raw, code) => expect(parseEmailCode(raw)).toBe(code));
  it.each(["12345", "12345678901", "12a456", "", "      ", null, 123456, "１２３４５６"])("rejects code %j", (raw) => expect(parseEmailCode(raw)).toBeNull());
  it("accepts plausible token hashes only", () => {
    expect(parseTokenHash("pkce_0123456789abcdef0123456789abcdef")).toBe("pkce_0123456789abcdef0123456789abcdef");
    for (const bad of ["", "short", "has space in it here", "x".repeat(257), "<script>alert(1)</script>", null]) expect(parseTokenHash(bad)).toBeNull();
  });
  it("accepts only email sign-in link types", () => {
    for (const t of ["email", "magiclink", "signup"]) expect(parseEmailLinkType(t)).toBe("email");
    for (const t of ["recovery", "invite", "email_change", "", null]) expect(parseEmailLinkType(t)).toBeNull();
  });
});

describe("return path from the emailed redirect", () => {
  it("keeps a safe internal destination on this origin", () =>
    expect(returnPathFromRedirect(`${ORIGIN}/auth/confirm?next=%2Fdishes%2Fabc%23rate`, ORIGIN)).toBe("/dishes/abc#rate"));
  it.each([
    `https://evil.example/auth/confirm?next=%2Fdishes%2Fabc`,
    `${ORIGIN}/auth/confirm?next=https%3A%2F%2Fevil.example`,
    `${ORIGIN}/auth/confirm?next=%2F%2Fevil.example`,
    `${ORIGIN}/auth/confirm`,
    "not a url", "", null,
  ])("falls back to / for %j", (raw) => expect(returnPathFromRedirect(raw, ORIGIN)).toBe("/"));
});
