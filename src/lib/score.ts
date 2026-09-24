// Accepts only exact tenths from 1.0 to 10.0 as text, so nothing is ever silently rounded.
// The database CHECK remains the backstop; this gives users a clear message first.
const SCORE = /^(?:10(?:\.0)?|[1-9](?:\.\d)?)$/;

export type ParsedScore = { ok: true; value: string } | { ok: false; message: string };

export function parseScore(raw: unknown): ParsedScore {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { ok: false, message: "Choose a score from 1.0 to 10.0." };
  if (!SCORE.test(text)) return { ok: false, message: "Scores go from 1.0 to 10.0 in steps of 0.1, like 7.5." };
  return { ok: true, value: Number(text).toFixed(1) };
}
