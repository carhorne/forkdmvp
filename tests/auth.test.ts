import { describe, expect, it } from "vitest";
import { safeReturnPath } from "../src/lib/auth/return-path";
describe("internal auth return paths", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/%5cevil.test", "/%2f%2fevil.test", "/%252f%252fevil.test", "/%0a/evil.test", "/auth/callback?code=bad", "javascript:alert(1)", " /dish", "", null, ["/dish"]])("rejects %s", (path) => expect(safeReturnPath(path)).toBe("/"));
  it("preserves a safe dish destination", () => expect(safeReturnPath("/dishes/123?q=rice#rating")).toBe("/dishes/123?q=rice#rating"));
});
