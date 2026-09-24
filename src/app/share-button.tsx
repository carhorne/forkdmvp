"use client";
import { useId, useState } from "react";
import type { ShareTarget } from "@/lib/share";

type Outcome = "idle" | "shared" | "copied" | "manual";

// Native share sheet when available (must run from this click), else copy message + link, else show a
// selectable link. Cancelling the share sheet is neither an error nor a success, so it shows nothing.
export function ShareButton({ share, label = "Share" }: { share: ShareTarget; label?: string }) {
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const linkId = useId();
  const onClick = async () => {
    setOutcome("idle");
    const data = { title: share.title, text: share.text, url: share.url };
    if (typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare(data))) {
      try { await navigator.share(data); setOutcome("shared"); return; }
      catch (error) { if ((error as Error)?.name === "AbortError") return; /* Otherwise fall back to copying. */ }
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(`${share.text} ${share.url}`);
      setOutcome("copied");
    } catch { setOutcome("manual"); }
  };
  return <div className="share">
    <button type="button" className="secondary" onClick={onClick}>{label}</button>
    <div aria-live="polite">
      {outcome === "shared" && <p className="share-note" role="status">Shared.</p>}
      {outcome === "copied" && <p className="share-note" role="status">Link copied.</p>}
      {outcome === "manual" && <div className="share-manual">
        <label htmlFor={linkId}>Copy this link</label>
        <input id={linkId} readOnly value={share.url} autoFocus onFocus={(e) => e.currentTarget.select()} />
      </div>}
    </div>
  </div>;
}
