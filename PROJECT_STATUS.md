# Forkd project status

Status: Slice 1 implemented; R1–R3 pass locally and on the Vercel preview; real-phone check pending. Slice 0 F2 mobile/sign-out/expired-link checks still open.
Current slice: 1 — Restaurant search (plan approved; implementation complete).
Launch area: Provo, Utah. 10 official-source menus reviewed and seeded (see seed/SOURCE_REVIEW.md).
Repository: https://github.com/carhorne/forkdmvp
Development Supabase: tvyzezmbyqszscldrqvi
Vercel: project forkdmvp, https://forkdmvp.vercel.app. Production target currently uses the development Supabase project (no production Supabase project yet).

## Slice progress

| Slice | State | Evidence |
|---|---|---|
| 0 Foundation | Manual checks pending | F1, F3, F4 met. F2: desktop magic-link sign-in on production confirmed by owner; mobile, sign-out and expired-link checks blocked by built-in email rate limit. |
| 1 Restaurant search | Real-phone check pending | R1–R3 pass locally and on the slice-1-search Vercel preview; see Slice 1 evidence. |
| 2 Ranked menu | Pending | — |
| 3 Menu discovery | Pending | — |
| 4 Ratings | Pending | — |
| 5 Sharing | Pending | — |
| 6 Integration/release | Pending | — |

## Latest handoff

- Accepted product scope: six features in ROADMAP.md; 10–20 manually verified local restaurant menus.
- Default decisions: 1.0–10.0 tenths; one editable rating/user/dish; email magic links; public saved-rating links without account identity; selected menus labelled honestly.
- Next action: check Slice 1 on a real phone, merge slice-1-search, finish Slice 0 F2 checks, then plan Slice 2 (ranked menu).
- Release blockers: F2 remaining checks, custom SMTP sender before testers, preview APP_URL, production Supabase project, Slices 2–6.

## Slice 1 evidence — 2026-09-22

Slice and acceptance IDs: 1 / R1–R3.
Files changed and reason: src/lib/search.ts (query trim, 100-char limit, LIKE escaping, UUID check); src/lib/catalog.ts (bounded name search, get-by-ID); src/app/page.tsx (Next.js Form search, keyed Suspense results, empty/too-long/failure states; sample dishes removed so results never imply dish search); src/app/restaurants/[restaurantId]/page.tsx (public restaurant page, retired notice, 404); src/app/loading.tsx removed so notFound() returns a real 404 instead of a streamed 200; tests/search.test.ts.
Commands and actual outcomes: lint, typecheck, `npm test` (46/46, including escaping on real PostgreSQL via PGlite), build: pass.
Local checks against development data:
- R1: "bomb" → Bombay House; "SPICY" → Spicy Thai; "ThAi" and " thai " → Silver Dish Thai Cuisine, Spicy Thai; blank/whitespace → all 10 A–Z; "pad thai", "%", "_" → Not in Forkd yet; "daddy's" → Fat Daddy's Pizzeria.
- R2: result links open /restaurants/<uuid> with matching name, address, coverage and source; addresses distinguish the two Thai results.
- R3: 101 characters → "That search is too long"; 100 → normal search; unknown UUID, malformed ID and quote-injection ID → HTTP 404 page; failure state renders retry.
- Chrome at 390 and 320 px: no horizontal overflow, all targets ≥ 44 px, keyboard reaches search, back navigation restores the query, no console errors.
Database/auth impact: none (no migration; anon SELECT on restaurants already allowed).
- Vercel preview (slice-1-search, via `vercel curl`): "ThAi" → both Thai restaurants; "pad thai" → Not in Forkd yet; "bomb" result opens Bombay House; malformed ID → 404.
Remaining issues: real-phone check; loading feedback when opening a restaurant relies on browser navigation only (revisit in Slice 2 when the menu query is heavier); /favicon.ico is missing (pre-existing).

## Slice 0 evidence — 2026-09-22

Date / commit: 2026-09-22, on top of ac58014.
Slice and acceptance IDs: 0 / F1–F4.
Files changed and reason: seed/verified/*.json and seed/SOURCE_REVIEW.md (10 reviewed Provo menus); this file.
Commands and actual outcomes:
- `npm run lint`, `npm run typecheck`, `npm test` (33/33), `npm run build`: pass.
- `seed:validate`: 10 locations, 100 dishes. `seed:dry-run` on development: every location create/update/retire 0, unchanged 11.
- F4 hosted: `seed:apply` run twice on development. Before, after one and after two applies: 10 restaurants, 100 dishes, 0 ratings, identical SHA-256 over all restaurant/dish rows (IDs and timestamps included). Partial-import rollback and rating preservation are covered by tests/database.test.ts.
- F1: local dev server, https://forkdmvp.vercel.app and the slice-0-acceptance branch preview (fetched through deployment protection with `vercel curl`) render "10 locations" from development Supabase.
- F2 automated: /auth/callback with off-site `next` or an invalid code redirects to /login?error=callback&next=%2F on local and production; the login page shows recovery text. User pages send `Cache-Control: private, no-store`.
Vercel changes: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY recreated as non-sensitive (Production + Preview, development values). APP_URL for Production was empty (callback returned 500); recreated as https://forkdmvp.vercel.app and redeployed.
Database/auth impact: no schema change; seed applies were no-ops.
Remaining issues:
- F2 manual: real magic-link sign-in, session refresh, sign-out, expired link, on production. Confirm Supabase Auth Site URL and redirect allowlist include https://forkdmvp.vercel.app/auth/callback.
- Preview APP_URL is still the old (likely empty) value, so /auth/callback returns 500 on previews. Choose a stable preview origin and set it before testing sign-in there.
- Vercel Production also holds SUPABASE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY, which ENVIRONMENT.md forbids and the app never reads; remove them. SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are unused.
- Q1 real-phone inspection of / and /login.
Next bounded action: finish the manual F2 checks, then plan Slice 1 (restaurant search).

## Evidence template

Date / commit:
Slice and acceptance IDs:
Files changed and reason:
Commands and actual outcomes:
Manual checks / device:
Database/auth impact:
Remaining issues:
Next bounded action:
