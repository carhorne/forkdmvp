import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { getCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { RetryButton } from "./retry-button";

export const dynamic = "force-dynamic";
export default async function Home() {
  const configured = !!publicEnv();
  let failed = false;
  let catalog: Awaited<ReturnType<typeof getCatalog>> = [];
  let signedIn = false;
  if (configured) {
    try { catalog = await getCatalog(); } catch { failed = true; }
    try { const client = await createClient(); const { data } = await client.auth.getClaims(); signedIn = !!data?.claims?.sub; } catch { /* Public browsing remains available. */ }
  }
  return <>
    <section className="hero"><p className="eyebrow">PROVO, UTAH · A SEAT AT THE TABLE</p><h1>Know what<br />to order.</h1><p className="intro">Local spots. Menus worth getting to know. A carefully checked collection, one restaurant at a time.</p></section>
    <section aria-labelledby="catalog-title"><div className="section-bar"><h2 id="catalog-title">The local collection</h2><span className="count">{catalog.length ? `${catalog.length} locations` : "EARLY EDITION"}</span></div>
      {failed ? <div className="notice" role="alert"><h2>The menus couldn’t load.</h2><p>Please check your connection and try again.</p><RetryButton /></div>
      : !catalog.length ? <div className="notice"><h2>We’re setting the table.</h2><p>Our first Provo menus are being checked. Verified restaurant details will appear here when they’re ready.</p><p className="muted">A small local collection. Selected menus, with sources you can check.</p></div>
      : <div className="catalog">{catalog.map((r) => <article className="restaurant" key={r.id}>
        <p className="eyebrow">{r.cuisine || "LOCAL RESTAURANT"}</p><h3>{r.name}</h3><p className="address">{r.address}<br />{r.city}, {r.region}</p>
        <ul className="menu-sample" aria-label={`A few dishes at ${r.name}`}>{r.sample.map((d) => <li key={d.id}><div className="dish-line"><span>{d.name}</span><span>{d.price_cents === null ? "Price unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: d.currency }).format(d.price_cents / 100)}</span></div></li>)}</ul>
        <p className="provenance">{r.menu_coverage === "selected" ? "Selected menu" : "Full menu"} · Checked {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(r.source_checked_at))}<br /><a href={r.menu_source_url} target="_blank" rel="noopener noreferrer">Restaurant’s menu source ↗</a> · Menus and prices may change.</p>
      </article>)}</div>}
    </section>
    <section className="auth-strip" aria-label="Account"><p>{signedIn ? "You’re signed in. Welcome to Forkd." : "Take a look around. You don’t need an account to browse."}</p>{signedIn ? <form action={signOut}><button>Sign out</button></form> : <Link className="button" href="/login">Sign in</Link>}</section>
  </>;
}
