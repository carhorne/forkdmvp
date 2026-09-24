import { MAX_QUERY_LENGTH } from "@/lib/search";

export const MENU_PAGE_SIZE = 50;
export const SORTS = { top: "Top Rated", most: "Most Rated", price: "Price Low → High" } as const;
export type MenuSort = keyof typeof SORTS;
const MAX_CATEGORY_LENGTH = 80;
const MAX_PAGE = 10000 / MENU_PAGE_SIZE + 1; // menu_page accepts offsets up to 10,000

export type MenuParams = { q: string; qTooLong: boolean; category: string | null; sort: MenuSort; page: number };
type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Reads restaurant URL controls; anything invalid falls back to its default instead of erroring.
export function parseMenuParams(raw: Raw): MenuParams {
  const q = first(raw.q).trim();
  const category = first(raw.category).trim();
  const sort = first(raw.sort);
  const page = first(raw.page);
  return {
    q,
    qTooLong: q.length > MAX_QUERY_LENGTH,
    category: category && category.length <= MAX_CATEGORY_LENGTH ? category : null,
    sort: Object.hasOwn(SORTS, sort) ? (sort as MenuSort) : "top",
    page: /^[1-9]\d{0,3}$/.test(page) && Number(page) <= MAX_PAGE ? Number(page) : 1,
  };
}

// Canonical restaurant URL; defaults are omitted so shared links stay short.
export function menuHref(restaurantId: string, params: Partial<Omit<MenuParams, "qTooLong">>) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.sort && params.sort !== "top") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return `/restaurants/${restaurantId}${qs ? `?${qs}` : ""}`;
}
