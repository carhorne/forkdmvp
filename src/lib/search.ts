export const MAX_QUERY_LENGTH = 100;

export type RestaurantQuery =
  | { kind: "all"; text: "" }
  | { kind: "name"; text: string; pattern: string }
  | { kind: "too-long"; text: string };

// Normalizes the raw `q` search param. Name search only; never matches dishes.
export function parseRestaurantQuery(raw: string | string[] | undefined): RestaurantQuery {
  const text = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  if (!text) return { kind: "all", text: "" };
  if (text.length > MAX_QUERY_LENGTH) return { kind: "too-long", text };
  return { kind: "name", text, pattern: `%${escapeLike(text)}%` };
}

// Makes LIKE wildcards and the escape character literal (Postgres default escape is backslash).
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string) {
  return UUID.test(value);
}
