"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="hero"><h1>Let’s try that again.</h1><p className="intro">We couldn’t load this page. Check your connection and try again.</p><button onClick={reset}>Try again</button></section>;
}
