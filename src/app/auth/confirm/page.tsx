import type { Metadata } from "next";
import Link from "next/link";
import { appOrigin } from "@/lib/env";
import { parseEmailLinkType, parseTokenHash, returnPathFromRedirect } from "@/lib/auth/otp";
import { safeReturnPath } from "@/lib/auth/return-path";
import { confirmSignIn } from "./actions";

export const metadata: Metadata = { title: "Finish signing in — Forkd", robots: { index: false } };
export const dynamic = "force-dynamic";

// The emailed link lands here. Signing in needs one tap, so mail scanners that open links automatically
// cannot use up the one-time token before the person does.
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tokenHash = parseTokenHash(one(params.token_hash));
  const type = parseEmailLinkType(one(params.type));
  // `redirect_to` comes from the email template; `next` is used when the page is reached directly.
  const next = one(params.redirect_to) ? returnPathFromRedirect(one(params.redirect_to), appOrigin()) : safeReturnPath(one(params.next));
  if (!tokenHash || !type) return <section className="login"><h1>This link isn’t complete.</h1>
    <p className="intro">Open the newest sign-in email and tap its link again, or enter the code from that email.</p>
    <Link className="button" href={`/login?next=${encodeURIComponent(next)}`}>Go to sign in</Link></section>;
  return <section className="login"><p className="eyebrow">ALMOST THERE</p><h1>Finish signing in.</h1>
    <p className="intro">Tap the button to sign in to Forkd on this device.</p>
    <form action={confirmSignIn}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <button>Sign in to Forkd</button>
    </form>
    <p className="muted"><Link href="/">Not you? Back to the public catalog</Link></p></section>;
}
