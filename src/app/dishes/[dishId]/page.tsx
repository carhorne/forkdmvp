import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDish, getOwnRating } from "@/lib/catalog";
import { formatCheckedDate, formatPrice } from "@/lib/format";
import { ScoreBadge } from "@/app/score-badge";
import { dishPath, dishShare, dishShareText, pageMetadata, ratingShare } from "@/lib/share";
import { ShareButton } from "@/app/share-button";
import { RatingForm } from "./rating-form";

type Props = { params: Promise<{ dishId: string }> };
// Metadata and page share one database request per render.
const load = cache(getDish);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dish = await load((await params).dishId);
  if (!dish) return { title: "Not found — Forkd" };
  const t = dishShareText(dish);
  return pageMetadata({ title: t.title, description: `${t.text} ${dish.category}.`, path: dishPath(dish.id) });
}

export const dynamic = "force-dynamic";
export default async function DishPage({ params }: Props) {
  const dish = await load((await params).dishId);
  if (!dish) notFound();
  const share = dishShare(dish);
  return <>
    <p className="back"><Link href={`/restaurants/${dish.restaurant_id}`}>← {dish.restaurant_name}</Link></p>
    <section className="hero">
      <p className="eyebrow">{dish.category}</p>
      <h1 className={dish.name.length > 48 ? "title-long" : undefined}>{dish.name}</h1>
      <p className="address">
        <Link href={`/restaurants/${dish.restaurant_id}`}>{dish.restaurant_name}</Link><br />
        {dish.restaurant_address}, {dish.restaurant_city}, {dish.restaurant_region}
      </p>
      {!dish.is_active && <p className="status">No longer on the current menu.</p>}
      {dish.is_active && !dish.restaurant_is_active && <p className="status">This restaurant is no longer in Forkd’s current collection.</p>}
    </section>
    <section className="dish-facts" aria-label="Dish details">
      <div className="fact"><span className="fact-label">Community rating</span><ScoreBadge average={dish.average_score} count={dish.rating_count} large />
        {share && <ShareButton share={share} label="Share this dish" />}</div>
      <div className="fact"><span className="fact-label">Price</span><span className="fact-value">{formatPrice(dish.price_cents, dish.currency)}</span></div>
      {dish.description && <p className="dish-desc">{dish.description}</p>}
      <div className="fact" id="rate">
        {dish.is_active && dish.restaurant_is_active
          ? <RatingSection dishId={dish.id} dishName={dish.name} restaurantName={dish.restaurant_name} />
          : <p className="muted">Ratings are closed because this dish is no longer on the current menu.</p>}
      </div>
      <p className="provenance">From the restaurant’s menu, checked {formatCheckedDate(dish.source_checked_at)}.<br />
        <a href={dish.source_url} target="_blank" rel="noopener noreferrer">Restaurant’s menu source ↗</a> · Menus and prices may change.</p>
    </section>
  </>;
}

async function RatingSection({ dishId, dishName, restaurantName }: { dishId: string; dishName: string; restaurantName: string }) {
  let own: Awaited<ReturnType<typeof getOwnRating>>;
  try { own = await getOwnRating(dishId); } catch {
    return <div className="notice" role="alert"><p>Your rating couldn’t load. Please refresh to try again.</p></div>;
  }
  const saved = own.rating ? Number(own.rating.score).toFixed(1) : null;
  // Built from the SAVED row only, so an unsaved slider value can never be shared.
  const share = own.rating ? ratingShare({ id: own.rating.id, score: own.rating.score, updated_at: own.rating.updated_at, dish_name: dishName, restaurant_name: restaurantName }) : null;
  return <RatingForm dishId={dishId} signedIn={own.signedIn} savedScore={saved} share={share} />;
}
