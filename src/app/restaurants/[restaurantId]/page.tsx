import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getMenu, getRestaurant } from "@/lib/catalog";
import { formatCheckedDate, formatPrice } from "@/lib/format";
import { RetryButton } from "@/app/retry-button";
import { ScoreBadge } from "@/app/score-badge";

type Props = { params: Promise<{ restaurantId: string }> };
// Metadata and page share one database request per render.
const load = cache(getRestaurant);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const restaurant = await load((await params).restaurantId);
  return { title: restaurant ? `${restaurant.name} — Forkd` : "Not found — Forkd" };
}

export const dynamic = "force-dynamic";
export default async function RestaurantPage({ params }: Props) {
  // Resolved before any Suspense boundary so unknown IDs return a real 404 status.
  const restaurant = await load((await params).restaurantId);
  if (!restaurant) notFound();
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
      {restaurant.is_active
        ? <Suspense fallback={<p className="notice" role="status">Loading the menu…</p>}><Menu restaurantId={restaurant.id} /></Suspense>
        : <div className="notice"><p>This menu is no longer available. Links to its dishes still work.</p></div>}
      <p className="provenance">{restaurant.menu_coverage === "selected" ? "A selection of dishes, not the full menu." : "Full menu."} Checked {formatCheckedDate(restaurant.source_checked_at)}.<br />
        <a href={restaurant.menu_source_url} target="_blank" rel="noopener noreferrer">Restaurant’s menu source ↗</a> · Menus and prices may change.</p>
    </section>
  </>;
}

async function Menu({ restaurantId }: { restaurantId: string }) {
  let dishes: Awaited<ReturnType<typeof getMenu>>;
  try { dishes = await getMenu(restaurantId); } catch {
    return <div className="notice" role="alert"><h2>The menu couldn’t load.</h2><p>Please check your connection and try again.</p><RetryButton /></div>;
  }
  if (!dishes.length) return <div className="notice"><p>No dishes from this menu are in Forkd yet.</p></div>;
  const anyRated = dishes.some((d) => d.average_score !== null);
  return <>
    <p className="count">{anyRated ? <>Top rated first, by community average. Unrated dishes follow, <span className="nowrap">A–Z</span>.</> : <>No ratings yet. Dishes are listed <span className="nowrap">A–Z</span> until diners rate them.</>}</p>
    <ol className="menu">{dishes.map((d) => <li key={d.id}>
      <Link className="dish" href={`/dishes/${d.id}`}>
        <span className="dish-main">
          <span className="dish-name">{d.name}</span>
          <span className="dish-meta">{d.category} · <span className="nowrap">{formatPrice(d.price_cents, d.currency)}</span></span>
          {d.description && <span className="dish-desc">{d.description}</span>}
        </span>
        <ScoreBadge average={d.average_score} count={d.rating_count} />
      </Link>
    </li>)}</ol>
  </>;
}
