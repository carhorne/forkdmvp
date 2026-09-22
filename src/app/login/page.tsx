import Link from "next/link";
import { safeReturnPath } from "@/lib/auth/return-path";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <section className="login"><p className="eyebrow">WELCOME TO THE TABLE</p><h1>A little more<br />local knowledge.</h1>
    <p className="intro">Sign in to Forkd. Browsing menus is always open to everyone.</p>
    {params.error && <p className="status" role="alert">{params.error === "signout" ? "We couldn’t sign you out. Please return to the catalog and try again." : "That link has expired, was already used, or couldn’t be verified in this browser. Request a new link below."}</p>}
    <LoginForm next={safeReturnPath(params.next)} /><p className="muted"><Link href="/">Back to the public catalog</Link></p>
  </section>;
}
