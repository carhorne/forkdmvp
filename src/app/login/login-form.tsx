"use client";
import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle", message: "" };
export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, initial);
  return <form action={action}>
    <input type="hidden" name="next" value={next} />
    <label htmlFor="email">Email address</label>
    <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" aria-describedby="email-help" />
    <p id="email-help" className="muted">We’ll email you a sign-in link. No password needed.</p>
    <button disabled={pending}>{pending ? "Sending your link…" : state.status === "sent" ? "Send another link" : "Email me a sign-in link"}</button>
    <div aria-live="polite">{state.message && <p className="status" role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}</div>
  </form>;
}
