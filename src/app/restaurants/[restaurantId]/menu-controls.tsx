"use client";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { menuHref, SORTS, type MenuSort } from "@/lib/menu-params";
import { MAX_QUERY_LENGTH } from "@/lib/search";

type Props = { restaurantId: string; q: string; category: string | null; sort: MenuSort; categories: string[] | null };

// Plain GET form (works without JavaScript). With JavaScript, dropdowns apply immediately and every
// change navigates to the canonical URL. Page is never submitted, so any control change resets to page 1.
export function MenuControls({ restaurantId, q, category, sort, categories }: Props) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const apply = () => {
    const data = new FormData(form.current!);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    router.push(menuHref(restaurantId, { q: value("q"), category: value("category") || null, sort: value("sort") as MenuSort }), { scroll: false });
  };
  return <form ref={form} action={`/restaurants/${restaurantId}`} className="menu-controls" role="search" aria-label="Search and sort this menu"
    onSubmit={(e) => { e.preventDefault(); apply(); }}>
    <label htmlFor="menu-q">Search this menu</label>
    <div className="search-row">
      <input id="menu-q" name="q" type="search" defaultValue={q} maxLength={MAX_QUERY_LENGTH} placeholder="Dish or ingredient" autoComplete="off" enterKeyHint="search" />
      <button type="submit">Search</button>
    </div>
    <div className="control-row">
      {categories && categories.length > 1 && <div className="control">
        <label htmlFor="menu-category">Category</label>
        <select id="menu-category" name="category" defaultValue={category ?? ""} onChange={apply}>
          <option value="">All</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>}
      <div className="control">
        <label htmlFor="menu-sort">Sort</label>
        <select id="menu-sort" name="sort" defaultValue={sort} onChange={apply}>
          {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
    </div>
  </form>;
}
