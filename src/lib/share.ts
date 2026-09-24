import type { Metadata } from "next";
import { appOrigin } from "@/lib/env";
import { formatCheckedDate, formatRatingCount, formatScore } from "@/lib/format";

export type ShareTarget = { url: string; title: string; text: string };

// The configured public origin (APP_URL). Null where none is configured (e.g. previews), in which case
// share buttons are hidden rather than emitting a wrong or localhost link.
export function configuredOrigin() {
  try { return appOrigin(); } catch { return null; }
}

function target(path: string, title: string, text: string, origin = configuredOrigin()): ShareTarget | null {
  return origin ? { url: new URL(path, origin).href, title, text } : null;
}

type RestaurantLike = { id: string; name: string; address: string; city: string };
type DishLike = { id: string; name: string; restaurant_name: string; average_score: number | string | null; rating_count: number | string };
type RatingLike = { id: string; score: number | string; dish_name: string; restaurant_name: string; updated_at: string };

export const restaurantPath = (id: string) => `/restaurants/${id}`;
export const dishPath = (id: string) => `/dishes/${id}`;
export const ratingPath = (id: string) => `/ratings/${id}`;

export function restaurantShareText(r: RestaurantLike) {
  return { title: `${r.name} on Forkd`, text: `See what to order at ${r.name} (${r.address}, ${r.city}) on Forkd.` };
}

// Community score and count, straight from the database projection.
export function dishShareText(d: DishLike) {
  const score = formatScore(d.average_score);
  return {
    title: `${d.name} at ${d.restaurant_name}`,
    text: score === null
      ? `${d.name} at ${d.restaurant_name} on Forkd. No ratings yet.`
      : `${d.name} at ${d.restaurant_name}: ${score}/10 from ${formatRatingCount(d.rating_count)} on Forkd.`,
  };
}

// Always the person's saved score, labelled as an individual rating; never the community score.
export function ratingShareText(r: RatingLike) {
  const score = Number(r.score).toFixed(1);
  return {
    title: `A ${score}/10 rating of ${r.dish_name}`,
    text: `I rated ${r.dish_name} at ${r.restaurant_name} ${score}/10 on Forkd.`,
    description: `An individual ${score}/10 rating of ${r.dish_name} at ${r.restaurant_name}, updated ${formatCheckedDate(r.updated_at)}.`,
  };
}

export const restaurantShare = (r: RestaurantLike, origin?: string | null) => { const t = restaurantShareText(r); return target(restaurantPath(r.id), t.title, t.text, origin ?? undefined); };
export const dishShare = (d: DishLike, origin?: string | null) => { const t = dishShareText(d); return target(dishPath(d.id), t.title, t.text, origin ?? undefined); };
export const ratingShare = (r: RatingLike, origin?: string | null) => { const t = ratingShareText(r); return target(ratingPath(r.id), t.title, t.text, origin ?? undefined); };

// Server-rendered title/description/canonical/Open Graph for a public page. The layout sets metadataBase
// from APP_URL, so relative paths resolve to production URLs.
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title: `${title} — Forkd`,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "Forkd", type: "website" },
    twitter: { card: "summary", title, description },
  };
}
