import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Forkd — Know what to order", description: "A small, carefully checked collection of local restaurant menus." };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><Link className="wordmark" href="/" aria-label="Forkd home">forkd<span>.</span></Link><span className="edition">THE LOCAL MENU</span></header>
    <main id="main">{children}</main>
    <footer>Good food starts with a little local knowledge.<br /><span>Forkd · Know what to order.</span></footer>
  </body></html>;
}
