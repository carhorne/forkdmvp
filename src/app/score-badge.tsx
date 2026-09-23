import { formatRatingCount, formatScore } from "@/lib/format";

// Community average to one decimal with its count; unrated is never shown as 0/10.
export function ScoreBadge({ average, count, large = false }: { average: number | null; count: number; large?: boolean }) {
  const score = formatScore(average);
  return <span className={large ? "score score-large" : "score"}>
    {score === null
      ? <span className="score-none">No ratings yet</span>
      : <><span className="score-value">{score}<span className="sr-only"> out of 10 average from</span></span><span className="score-count">{formatRatingCount(count)}</span></>}
  </span>;
}
