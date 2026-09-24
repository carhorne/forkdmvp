import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { searchRestaurants } from "@/lib/catalog";
import { MAX_QUERY_LENGTH, parseRestaurantQuery, type RestaurantQuery } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { pageMetadata } from "@/lib/share";
import { PendingHint } from "./pending-hint";
import { RetryButton } from "./retry-button";

export const metadata = pageMetadata({ title: "Know what to order", description: "Search a small, hand-checked collection of Provo restaurant menus, see which dishes diners rate highest, and rate what you ate.", path: "/" });

export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseRestaurantQuery((await searchParams).q);
  const configured = !!publicEnv();
  let signedIn = false;
  if (configured) {
    try { const client = await createClient(); const { data } = await client.auth.getClaims(); signedIn = !!data?.claims?.sub; } catch { /* Public browsing remains available. */ }
  }
  return <>
    <section className="hero"><p className="eyebrow">PROVO, UTAH · A SEAT AT THE TABLE</p><h1>Know what<br />to order.</h1><p className="intro">Local spots. Menus worth getting to know. A carefully checked collection, one restaurant at a time.</p></section>
    <section aria-labelledby="catalog-title"><div className="section-bar"><h2 id="catalog-title">The local collection</h2></div>
      {/* Keyed so the box shows the current query after back/forward navigation. */}
      <Form action="/" className="search" role="search" key={`form:${query.text}`}>
        <label htmlFor="q">Find a restaurant</label>
        <div className="search-row">
          <input id="q" name="q" type="search" defaultValue={query.text} maxLength={MAX_QUERY_LENGTH} placeholder="Restaurant name" autoComplete="off" enterKeyHint="search" />
          <button type="submit">Search</button>
        </div>
      </Form>
      {!configured ? <PreparingNotice />
      : <Suspense key={`results:${query.text}`} fallback={<p className="notice" role="status">Searching the collection…</p>}><Results query={query} /></Suspense>}
    </section>
    <section className="auth-strip" aria-label="Account"><p>{signedIn ? "You’re signed in. Welcome to Forkd." : "Take a look around. You don’t need an account to browse."}</p>{signedIn ? <form action={signOut}><button>Sign out</button></form> : <Link className="button" href="/login">Sign in</Link>}</section>
  </>;
}

async function Results({ query }: { query: RestaurantQuery }) {
  if (query.kind === "too-long") return <div className="notice" role="alert"><h2>That search is too long.</h2><p>Searches are limited to {MAX_QUERY_LENGTH} characters. Try part of the restaurant’s name.</p><ClearSearch /></div>;
  let results: Awaited<ReturnType<typeof searchRestaurants>>;
  try { results = await searchRestaurants(query); } catch {
    return <div className="notice" role="alert"><h2>The menus couldn’t load.</h2><p>Please check your connection and try again.</p><RetryButton /></div>;
  }
  if (!results.length) return query.kind === "all" ? <PreparingNotice />
    : <div className="notice" role="status"><h2>Not in Forkd yet.</h2><p>No restaurant in our collection matches “{query.text}”. Forkd covers a small, hand-checked selection of Provo restaurants, and searches restaurant names only.</p><ClearSearch /></div>;
  const count = `${results.length} ${results.length === 1 ? "location" : "locations"}`;
  return <>
    <p className="count" role="status">{query.kind === "all" ? `${count}, A–Z` : `${count} matching “${query.text}”`}</p>
    <ul className="catalog">{results.map((r) => <li key={r.id}>
      <Link className="restaurant" href={`/restaurants/${r.id}`}>
        <p className="eyebrow">{r.cuisine || "LOCAL RESTAURANT"}</p><h3>{r.name}</h3>
        <p className="address">{r.address}<br />{r.city}, {r.region}</p>
        <p className="provenance">{r.menu_coverage === "selected" ? "Selected menu" : "Full menu"} <PendingHint /></p>
      </Link>
    </li>)}</ul>
    {query.kind === "name" && <ClearSearch />}
  </>;
}

function ClearSearch() { return <p className="tap-link"><Link href="/">Show all restaurants</Link></p>; }
function PreparingNotice() {
  return <div className="notice"><h2>We’re setting the table.</h2><p>Our first Provo menus are being checked. Verified restaurant details will appear here when they’re ready.</p><p className="muted">A small local collection. Selected menus, with sources you can check.</p></div>;
}
