"use client";
import { useLinkStatus } from "next/link";

// Inline feedback inside a tapped <Link> while its dynamic destination loads (these routes have no
// loading.js, so real 404 statuses are kept). Hidden from screen readers; the new page announces itself.
export function PendingHint() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className="pending-hint">{pending ? "Opening…" : ""}</span>;
}
