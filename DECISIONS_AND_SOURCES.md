# Decisions, blueprint mapping and sources

Prepared 2026-09-22 from the referenced “Menu Item Rating Apps” conversation and its attached `Pasted text.txt` (Vibe Coding — Blueprint Prompting). The attachment was read directly. The user's current request takes precedence over earlier brainstorms.

## Preserved requirements

The original Step 5 feature list includes sharing even though an earlier brainstorming section called it nice-to-have. All six Step 5 features are required here. The later conversation selects mobile-first web + Codex, Next.js/Supabase/Vercel, manual local menu seeding and one current rating per user/dish. This bundle caps launch coverage at the requested 10–20 restaurants rather than a later suggestion of 20–30.

## Blueprint translated into this bundle

| Blueprint section | Application |
|---|---|
| 06–07: context, scope, constraints, acceptance | PRODUCT_SPEC + ROADMAP and slice prompt templates |
| 07: persistent roadmap/tool rules | Root ROADMAP.md + Codex AGENTS.md; no Cursor configuration |
| 08: explicit non-goals | ROADMAP boundaries remain enforceable throughout the week |
| 09: plan before code | Separate plan-only and proceed prompts with plan review |
| 10: data model → core flow → secondary features | Slices 0–6 with acceptance gates |
| 11: review changes and negative paths | Acceptance tests and evidence log, no “runs means done” shortcut |
| 12–13: security/performance defaults | RLS, validation, environment secrets, bounded queries, indexes and N+1 review |
| 15–16: reusable prompting | CODEX_START_HERE.md and compact handoffs |

The sample “Best Dish” exercise's reviews/photos/user-added restaurants are not added as requirements. The provided Forkd scope controls. The blueprint's broad security statistic is not repeated as an independently verified claim.

## Explicit default decisions added for implementation clarity

- Rating scale: 1.0–10.0 in tenths, matching conversation examples; reject over-precision.
- Auth: email magic links; no social auth/profile surface.
- Filter: category; sorts: Top Rated, Most Rated, Price Low → High.
- Sharing a personal rating gets a stable public rating URL. Editing updates its current value. The author’s account identifier is never shown.
- Unknown prices are null; averages derive from real ratings; retired dishes preserve links/history.
- Curated images are optional; user uploads/written reviews are deferred.
- SQL migrations and Supabase client access replace the illustrative Prisma folder from the discussion.
- Launch locale and real restaurant selection remain unspecified. No sourced production seed dataset is included.

These are documented planning defaults, not claims that every detail was explicitly chosen in the earlier chat. Change them deliberately and keep related specs/tests consistent.

## Official implementation references checked

- [Codex AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): root project instructions; use this bundle's concise AGENTS.md for engineering conventions.
- [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs): current browser/server session integration.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): database authorization foundation.
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables): public environment values and build-time exposure.
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs): deployment integration.

Provider APIs and package versions can change; consult these official references while implementing. No OpenAI API key or AI product feature is needed for Forkd v0.1. The original conversation's broader competitor/API claims are not dependencies of this plan.
