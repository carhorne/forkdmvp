import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getRestaurant } from "@/lib/catalog";

type Props = { params: Promise<{ restaurantId: string }> };
// Metadata and page share one database request per render.
const load = cache(getRestaurant);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const restaurant = await load((await params).restaurantId);
  return { title: restaurant ? `${restaurant.name} — Forkd` : "Not found — Forkd" };
}

export const dynamic = "force-dynamic";
export default async function RestaurantPage({ params }: Props) {
  const restaurant = await load((await params).restaurantId);
  if (!restaurant) notFound();
  const checked = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(restaurant.source_checked_at));
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
      <div className="notice"><p>The ranked menu for this restaurant is on its way.</p></div>
      <p className="provenance">{restaurant.menu_coverage === "selected" ? "A selection of dishes, not the full menu." : "Full menu."} Checked {checked}.<br />
        <a href={restaurant.menu_source_url} target="_blank" rel="noopener noreferrer">Restaurant’s menu source ↗</a> · Menus and prices may change.</p>
    </section>
  </>;
}
