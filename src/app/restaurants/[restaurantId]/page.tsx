import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getMenuCategories, getMenuPage, getRestaurant } from "@/lib/catalog";
import { formatCheckedDate, formatPrice } from "@/lib/format";
import { MENU_PAGE_SIZE, menuHref, parseMenuParams, type MenuParams } from "@/lib/menu-params";
import { isUuid, MAX_QUERY_LENGTH } from "@/lib/search";
import { RetryButton } from "@/app/retry-button";
import { ScoreBadge } from "@/app/score-badge";
import { MenuControls } from "./menu-controls";

type Props = { params: Promise<{ restaurantId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
// Metadata and page share one database request per render.
const load = cache(getRestaurant);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const restaurant = await load((await params).restaurantId);
  return { title: restaurant ? `${restaurant.name} — Forkd` : "Not found — Forkd" };
}

export const dynamic = "force-dynamic";
export default async function RestaurantPage({ params, searchParams }: Props) {
  const id = (await params).restaurantId;
  // Resolved before any Suspense boundary so unknown IDs return a real 404 status.
  // Categories load in parallel; if they fail, the category control is simply hidden.
  const [restaurant, categories] = await Promise.all([load(id), isUuid(id) ? getMenuCategories(id).catch(() => null) : null]);
  if (!restaurant) notFound();
  const parsed = parseMenuParams(await searchParams);
  // A category that isn't on this menu falls back to All.
  const menu: MenuParams = { ...parsed, category: parsed.category && categories?.includes(parsed.category) ? parsed.category : null };
  return <>
    <p className="back"><Link href="/">← All restaurants</Link></p>
    <section className="hero">
      <p className="eyebrow">{restaurant.cuisine || "LOCAL RESTAURANT"}</p>
      <h1>{restaurant.name}</h1>
      <p className="address">{restaurant.address}<br />{restaurant.city}, {restaurant.region}</p>
      {!restaurant.is_active && <p className="status">This restaurant is no longer in Forkd’s current collection.</p>}
    </section>
    <section aria-labelledby="menu-title">
      <div className="section-bar"><h2 id="menu-title">The menu</h2><span className="count">{restaurant.menu_coverage === "selected" ? "SELECTED MENU" : "FULL MENU"}</span></div>
      {restaurant.is_active ? <>
        {/* Keyed so the controls show the URL's values after back/forward navigation. */}
        <MenuControls key={`controls:${menuHref(restaurant.id, menu)}`} restaurantId={restaurant.id} q={menu.q} category={menu.category} sort={menu.sort} categories={categories} />
        <Suspense key={`menu:${menuHref(restaurant.id, menu)}`} fallback={<p className="notice" role="status">Loading the menu…</p>}>
          <Menu restaurantId={restaurant.id} params={menu} />
        </Suspense>
      </> : <div className="notice"><p>This menu is no longer available. Links to its dishes still work.</p></div>}
      <p className="provenance">{restaurant.menu_coverage === "selected" ? "A selection of dishes, not the full menu." : "Full menu."} Checked {formatCheckedDate(restaurant.source_checked_at)}.<br />
        <a href={restaurant.menu_source_url} target="_blank" rel="noopener noreferrer">Restaurant’s menu source ↗</a> · Menus and prices may change.</p>
    </section>
  </>;
}

async function Menu({ restaurantId, params }: { restaurantId: string; params: MenuParams }) {
  const filtered = !!(params.q || params.category);
  const clearAll = params.q || params.category || params.sort !== "top"
    ? <p className="tap-link"><Link href={menuHref(restaurantId, {})}>Clear search and filters</Link></p> : null;
  if (params.qTooLong) return <div className="notice" role="alert"><h2>That search is too long.</h2><p>Menu searches are limited to {MAX_QUERY_LENGTH} characters.</p>{clearAll}</div>;
  let result: Awaited<ReturnType<typeof getMenuPage>>;
  try { result = await getMenuPage(restaurantId, params); } catch {
    return <div className="notice" role="alert"><h2>The menu couldn’t load.</h2><p>Please check your connection and try again.</p><RetryButton /></div>;
  }
  const { dishes, total } = result;
  if (!dishes.length) {
    if (params.page > 1) return <div className="notice" role="status"><p>That page is past the end of this menu.</p><p className="tap-link"><Link href={menuHref(restaurantId, { ...params, page: 1 })}>Back to page 1</Link></p></div>;
    if (filtered) return <div className="notice" role="status"><h2>No dishes match.</h2><p>Nothing on this menu matches {params.q ? <>“{params.q}”</> : "that"}{params.category ? <> in {params.category}</> : null}. Search looks at dish names and descriptions on this menu only.</p>{clearAll}</div>;
    return <div className="notice"><p>No dishes from this menu are in Forkd yet.</p></div>;
  }
  const first = (params.page - 1) * MENU_PAGE_SIZE + 1;
  const last = first + dishes.length - 1;
  const noun = total === 1 ? "dish" : "dishes";
  const summary = filtered
    ? <>{total} {noun} {total === 1 ? "matches" : "match"}{params.q ? <> “{params.q}”</> : null}{params.category ? <> in {params.category}</> : null}</>
    : <>{total} {noun}</>;
  return <>
    <p className="count" role="status">{summary}{total > MENU_PAGE_SIZE ? <> · showing {first}–{last}</> : null}. <SortNote params={params} anyRated={dishes.some((d) => d.average_score !== null)} /></p>
    {clearAll}
    <ol className="menu" start={first}>{dishes.map((d) => <li key={d.id}>
      <Link className="dish" href={`/dishes/${d.id}`}>
        <span className="dish-main">
          <span className="dish-name">{d.name}</span>
          <span className="dish-meta">{d.category} · <span className="nowrap">{formatPrice(d.price_cents, d.currency)}</span></span>
          {d.description && <span className="dish-desc">{d.description}</span>}
        </span>
        <ScoreBadge average={d.average_score} count={d.rating_count} />
      </Link>
    </li>)}</ol>
    {total > MENU_PAGE_SIZE && <nav className="pager" aria-label="Menu pages">
      {params.page > 1 ? <Link className="button" rel="prev" href={menuHref(restaurantId, { ...params, page: params.page - 1 })}>← Previous</Link> : <span />}
      <span className="count">Page {params.page} of {Math.ceil(total / MENU_PAGE_SIZE)}</span>
      {last < total ? <Link className="button" rel="next" href={menuHref(restaurantId, { ...params, page: params.page + 1 })}>Next →</Link> : <span />}
    </nav>}
  </>;
}

function SortNote({ params, anyRated }: { params: MenuParams; anyRated: boolean }) {
  if (params.sort === "price") return <>Lowest price first; unknown prices last.</>;
  if (params.sort === "most") return <>Most rated first; unrated dishes last, <span className="nowrap">A–Z</span>.</>;
  return anyRated ? <>Top rated first, by community average; unrated dishes last, <span className="nowrap">A–Z</span>.</>
    : <>No ratings yet, so dishes are listed <span className="nowrap">A–Z</span>.</>;
}
