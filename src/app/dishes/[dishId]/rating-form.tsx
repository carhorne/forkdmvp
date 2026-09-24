"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { saveRating, type RatingState } from "./actions";

type Props = { dishId: string; signedIn: boolean; savedScore: string | null };
const initial: RatingState = { status: "idle" };
const DRAFT_TTL_MS = 60 * 60 * 1000;
const draftKey = (dishId: string) => `forkd:draft-rating:${dishId}`;

// A signed-out visitor's unsaved score lives only in this browser (never on the server) so it survives
// the magic-link round trip, which often opens in a new tab. It is never submitted automatically.
function readDraft(dishId: string) {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey(dishId)) ?? "null") as { score?: unknown; at?: unknown } | null;
    if (draft && typeof draft.score === "string" && typeof draft.at === "number" && Date.now() - draft.at < DRAFT_TTL_MS) return draft.score;
  } catch { /* Storage unavailable or corrupt: start without a draft. */ }
  return null;
}
function writeDraft(dishId: string, score: string) {
  try { localStorage.setItem(draftKey(dishId), JSON.stringify({ score, at: Date.now() })); } catch { /* Storage unavailable. */ }
}
function clearDraft(dishId: string) {
  try { localStorage.removeItem(draftKey(dishId)); } catch { /* Storage unavailable. */ }
}

export function RatingForm({ dishId, signedIn, savedScore }: Props) {
  const router = useRouter();
  // A dropped connection rejects the action call itself; report it here instead of the page error screen,
  // keeping the entered score and never showing success.
  const [state, action, pending] = useActionState(async (previous: RatingState, form: FormData): Promise<RatingState> => {
    try { return await saveRating(previous, form); }
    catch { return { status: "error", message: "We couldn’t reach Forkd. Your score is still here. Check your connection and try again." }; }
  }, initial);
  const [value, setValue] = useState(savedScore ?? "5.5");
  const [restored, setRestored] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(`/dishes/${dishId}#rate`)}`;
  const slider = Number(value) >= 1 && Number(value) <= 10 ? Number(value) : 5.5;

  // After sign-in, offer the draft back; the user must still press Save.
  useEffect(() => {
    const draft = signedIn ? readDraft(dishId) : null;
    if (draft) { setValue(draft); setRestored(true); } // eslint-disable-line react-hooks/set-state-in-effect -- reads browser-only storage after hydration
  }, [dishId, signedIn]);
  useEffect(() => { if (state.status === "saved") clearDraft(dishId); }, [state, dishId]);

  const heading = savedScore ? "Your rating" : "Rate this dish";
  return <form action={action} className="rating-form" aria-labelledby="rate-title" onSubmit={(e) => {
    if (!signedIn) { e.preventDefault(); writeDraft(dishId, value); router.push(loginHref); }
  }}>
    <h2 id="rate-title">{heading}</h2>
    <input type="hidden" name="dishId" value={dishId} />
    <div className="score-entry">
      <output htmlFor="rate-score rate-slider" className="score-display" aria-live="polite">{value || "–"}</output>
      <span className="muted">out of 10</span>
    </div>
    <label htmlFor="rate-slider" className="sr-only">Score slider</label>
    <input id="rate-slider" type="range" min={1} max={10} step={0.1} value={slider} aria-describedby="rate-help"
      onChange={(e) => setValue(Number(e.target.value).toFixed(1))} />
    <label htmlFor="rate-score">Score (1.0 to 10.0)</label>
    <input id="rate-score" name="score" type="number" inputMode="decimal" min={1} max={10} step={0.1} required value={value}
      onChange={(e) => setValue(e.target.value)} aria-describedby="rate-help" />
    <p id="rate-help" className="muted">Your score is shown publicly with this dish. Your email and account are never shown.</p>
    {restored && state.status === "idle" && <p className="status" role="status">We kept the score you chose before signing in. Press Save to submit it.</p>}
    <button type="submit" disabled={pending}>{pending ? "Saving…" : !signedIn ? "Sign in to rate" : savedScore ? "Update rating" : "Save rating"}</button>
    <div aria-live="polite">
      {state.status === "saved" && <p className="status" role="status">{state.message}</p>}
      {state.status === "error" && <p className="status error" role="alert">{state.message}</p>}
      {state.status === "signed-out" && <p className="status error" role="alert">{state.message}{" "}
        <Link href={loginHref} onClick={() => writeDraft(dishId, value)}>Sign in</Link></p>}
    </div>
  </form>;
}
