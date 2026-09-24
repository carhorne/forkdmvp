"use client";
import { useActionState, useState } from "react";
import { requestSignIn, verifyCode, type CodeState, type LoginState } from "./actions";

const initialRequest: LoginState = { status: "idle", message: "" };
const initialCode: CodeState = { status: "idle", message: "" };

export function LoginForm({ next }: { next: string }) {
  const [request, requestAction, sending] = useActionState(requestSignIn, initialRequest);
  const [code, codeAction, verifying] = useActionState(verifyCode, initialCode);
  const [changingEmail, setChangingEmail] = useState(false);
  const sentTo = request.status === "sent" && !changingEmail ? request.email : null;

  if (sentTo) return <div className="login-steps">
    <p className="status" role="status">{request.message}</p>
    <form action={codeAction}>
      <input type="hidden" name="email" value={sentTo} />
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code">Code from the email</label>
      <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" maxLength={12} required autoFocus
        aria-describedby="code-help" className="code-input" />
      <p id="code-help" className="muted">The code and link expire after an hour. Only the newest email works.</p>
      <button disabled={verifying}>{verifying ? "Checking…" : "Sign in"}</button>
      <div aria-live="polite">{code.status === "error" && <p className="status error" role="alert">{code.message}</p>}</div>
    </form>
    <form action={requestAction} className="login-secondary">
      <input type="hidden" name="email" value={sentTo} />
      <input type="hidden" name="next" value={next} />
      <button className="secondary" disabled={sending}>{sending ? "Sending…" : "Send a new code"}</button>
      <button type="button" className="secondary" onClick={() => setChangingEmail(true)}>Use a different email</button>
    </form>
  </div>;

  const defaultEmail = request.status === "error" ? request.email : request.status === "sent" ? request.email : undefined;
  return <form action={(data) => { setChangingEmail(false); return requestAction(data); }}>
    <input type="hidden" name="next" value={next} />
    <label htmlFor="email">Email address</label>
    <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" defaultValue={defaultEmail} aria-describedby="email-help" />
    <p id="email-help" className="muted">We’ll email you a sign-in code and link. No password needed.</p>
    <button disabled={sending}>{sending ? "Sending…" : "Email me a code"}</button>
    <div aria-live="polite">{request.status === "error" && <p className="status error" role="alert">{request.message}</p>}</div>
  </form>;
}
