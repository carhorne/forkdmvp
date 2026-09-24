import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublicRating } from "@/lib/catalog";
import { formatCheckedDate } from "@/lib/format";
import { dishPath, pageMetadata, ratingPath, ratingShare, ratingShareText, restaurantPath } from "@/lib/share";
import { ShareButton } from "@/app/share-button";

type Props = { params: Promise<{ ratingId: string }> };
// Metadata and page share one database request per render.
const load = cache(getPublicRating);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rating = await load((await params).ratingId);
  if (!rating) return { title: "Not found — Forkd" };
  const t = ratingShareText(rating);
  return pageMetadata({ title: t.title, description: t.description, path: ratingPath(rating.id) });
}

export const dynamic = "force-dynamic";
// A saved individual score, always current (the rating ID survives edits). Never shows who rated.
export default async function RatingPage({ params }: Props) {
  const rating = await load((await params).ratingId);
  if (!rating) notFound();
  const score = Number(rating.score).toFixed(1);
  const share = ratingShare(rating);
  return <>
    <section className="hero">
      <p className="eyebrow">AN INDIVIDUAL RATING</p>
      <p className="score-large score"><span className="score-value">{score}</span><span className="score-count">out of 10 · one diner’s score</span></p>
      <h1><Link href={dishPath(rating.dish_id)}>{rating.dish_name}</Link></h1>
      <p className="address"><Link href={restaurantPath(rating.restaurant_id)}>{rating.restaurant_name}</Link><br />{rating.restaurant_address}</p>
      <p className="muted">Updated {formatCheckedDate(rating.updated_at)}.</p>
      {!rating.dish_is_active && <p className="status">This dish is no longer on the current menu.</p>}
      {rating.dish_is_active && !rating.restaurant_is_active && <p className="status">This restaurant is no longer in Forkd’s current collection.</p>}
    </section>
    <section className="dish-facts" aria-label="More">
      <p className="tap-link"><Link href={dishPath(rating.dish_id)}>See the community rating for {rating.dish_name}</Link></p>
      {share && <ShareButton share={share} label="Share this rating" />}
    </section>
  </>;
}
