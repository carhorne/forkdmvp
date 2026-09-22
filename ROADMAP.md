# Forkd one-week roadmap

## Goal and scope

Help diners know what to order at a restaurant. Core loop: find restaurant → view ranked menu → refine menu → choose/eat → rate dish → share.

All six features are required: restaurant search; menu viewing; menu sort/filter; menu search within one restaurant; dish rating; sharing a dish, restaurant, and saved rating. Public browsing and sharing must work without login. Authentication supports rating ownership.

Build with Next.js/TypeScript, Supabase Postgres + Auth, optional Storage for curated assets, and Vercel. Target a 390 × 844 phone first and keep desktop usable. Seed 10–20 real local restaurant locations from manually reviewed restaurant-owned menu sources. Search only this database.

## Explicit non-goals

- Maps/geolocation, nearby-distance ranking, open-now filters.
- Cross-restaurant dish search.
- Friends/following/social feed, contacts import or in-app messaging.
- Favorites/Need-to-Try lists.
- AI recommendations/taste profiles, match scores or inferred review scores.
- Restaurant analytics/B2B, restaurant accounts or claiming, user-added restaurants.
- POS integrations.
- Menu scanning/scraping, OCR or automated menu extraction/import services.
- Nationwide coverage or external restaurant search providers.
- Notifications (essential authentication emails remain infrastructure).
- Native mobile app, app-store release, offline support or installable PWA work.
- Written reviews, user photo uploads, review voting and profile customization.

The blueprint's sample app is instructional, not a requirement to add every sample feature. Restaurant-request forms and future ingestion tools are deferred. Do not start them to fill empty states.

## Work cycle and schedule

For each slice: inspect → propose a small plan and affected files → review → implement → run checks → inspect the phone UI → record evidence. When a session requests planning only, stop before code. When implementation is already authorized against a reviewed plan, continue without repeated approval requests. A slice is complete only after its acceptance gate passes; a calendar date never overrides the gate.

| Day / slice | End-to-end work | Gate / acceptance IDs |
|---|---|---|
| 1 / 0: Foundation | Scaffold app; migrations/RLS; email authentication; seed validation/import; a minimal public database-backed list; deploy an early preview | Local app + preview run, sign-in/out works, 10 verified restaurant menus loaded, seed rerun safe; F1–F4 |
| 2 / 1: Restaurant search | Public search input → database results → restaurant navigation; loading/empty/error states | Finds a seeded name and opens its stable URL; R1–R3 |
| 2 / 2: Ranked menu | Restaurant → active menu → dish page, average/count display and no-rating state | Correct rankings and public dish routes; M1–M3 |
| 3 / 3: Menu discovery | Within-restaurant search, category filter and three sort modes together | Combined controls produce correct results and survive refresh; D1–D4 |
| 4 / 4: Ratings | Auth return flow → create/update own rating → fresh aggregates | One rating per user/dish and cross-user access tests pass; T1–T5 |
| 5 / 5: Sharing | Restaurant/dish/saved-rating URLs, mobile share and copy fallback, metadata | Each shared link resolves publicly to correct content; S1–S4 |
| 6 / 6a: Integration | Full journey, accessibility, mobile/error/security checks; optionally expand toward 20 restaurants | All required behavior passes on preview; Q1–Q4 |
| 7 / 6b: Release | Production configuration/migrations/seed, deploy, production smoke test and demo | Production gates pass; P1–P3 |

Slice dependencies: 0 → 1 → 2 → 3 → 4 → 5 → 6. Slice 0 is foundational but must prove one real database-to-screen path. Review Slice 1 before proceeding to Slice 2 even though they share Day 2.

## Scope protection and risks

If time is short, keep 10 restaurants instead of 20, omit photography, use a plain accessible layout, and prioritize fixes. Do not cut any of the six required features, ownership controls or public share links. Start authentication email delivery and preview deployment on Day 1 to surface configuration issues early. If real seed verification slips, record it as a release blocker; fictional menus are not an acceptable substitute.

No promised production rating counts: unrated dishes honestly show “No ratings yet.” Synthetic ratings may exist only in isolated development fixtures. Production testers contribute real ratings.

## Progress

All slices initially pending. Maintain `PROJECT_STATUS.md` with the current slice, checked acceptance IDs, actual check results and the next bounded action. Future ideas remain parked until the MVP is demonstrated.
