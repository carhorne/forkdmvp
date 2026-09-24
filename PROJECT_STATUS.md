# Forkd project status

Status: Slice 3 implemented; D1–D4 pass locally, in isolated DB tests and against development data. Slice 0 F2 mobile/sign-out/expired-link checks still open.
Current slice: 3 — Menu discovery (plan approved; implementation complete).
Launch area: Provo, Utah. 10 official-source menus reviewed and seeded (see seed/SOURCE_REVIEW.md).
Repository: https://github.com/carhorne/forkdmvp
Development Supabase: tvyzezmbyqszscldrqvi (local, Vercel Preview; labelled test data allowed).
Production Supabase: forkdprod, mlmcfssynaqqofadraxe (Vercel Production; verified seed, real ratings only).
Vercel: project forkdmvp, https://forkdmvp.vercel.app.

## Slice progress

| Slice | State | Evidence |
|---|---|---|
| 0 Foundation | Manual checks pending | F1, F3, F4 met. F2: desktop magic-link sign-in on production confirmed by owner; mobile, sign-out and expired-link checks blocked by built-in email rate limit. |
| 1 Restaurant search | Real-phone check pending | R1–R3 pass locally and on the slice-1-search Vercel preview; see Slice 1 evidence. |
| 2 Ranked menu | Real-phone check pending | M1–M3 pass locally, in isolated DB tests and with labelled test ratings on development; see Slice 2 evidence. |
| 3 Menu discovery | Real-phone check pending | D1–D4 pass in DB/unit tests, on development data with the 120-dish fixture, and in Chrome; see Slice 3 evidence. |
| 4 Ratings | Pending | — |
| 5 Sharing | Pending | — |
| 6 Integration/release | Pending | — |

## Latest handoff

- Accepted product scope: six features in ROADMAP.md; 10–20 manually verified local restaurant menus.
- Default decisions: 1.0–10.0 tenths; one editable rating/user/dish; email magic links; public saved-rating links without account identity; selected menus labelled honestly.
- Next action: check Slices 1–3 on a real phone, merge slice-3-discovery, finish Slice 0 F2 checks, then plan Slice 4 (ratings).
- Release blockers: F2 remaining checks, custom SMTP sender before testers (built-in limit is 2 emails/hour per project), preview APP_URL, Slices 4–6.

## Slice 3 evidence — 2026-09-23

Slice and acceptance IDs: 3 / D1–D4.
Files changed and reason: supabase/migrations/202609230002_menu_page.sql (menu_page RPC: allowlisted sort keys with fixed ORDER BY expressions, literal ILIKE search over name/description, exact category, sort before LIMIT/OFFSET, total_count window, input bounds, execute-only grants, no identity fields); src/lib/menu-params.ts (URL parsing with safe defaults, canonical links); src/lib/catalog.ts (getMenuPage, getMenuCategories; restaurant_menu no longer called); restaurant page (controls, count, clear, pager, empty/too-long/past-end states); menu-controls.tsx (GET form; dropdowns apply on change; canonical navigation; page never submitted); scripts/dev-menu-fixture.ts + `fixture:dev` (development-only, guarded); tests/menu-page.test.ts, tests/menu-params.test.ts, tests/db-helpers.ts; README.
Commands and actual outcomes: lint, typecheck, `npm test` (86/86), build: pass. Mutation check: flipping Most Rated's count order makes the page-boundary test fail. `supabase db push` of 202609230002 to development: applied. Fixture guard refuses the production env file and the production ref.
Checks:
- D1: DB tests: name and description matches, case and outer whitespace ignored, `%`/`_` literal, another restaurant's "Spicy" dish excluded, zero results. Development: Bombay House "chicken" and "  CHICKEN  " → 5; "pad thai" → No dishes match (Spicy Thai does list Pad Thai).
- D2: DB tests: category AND query narrow the same list with correct total_count. Development: Chicken Specialities + "masala" → Chicken Tikka Masala; Clear returns to the bare URL and resets all controls.
- D3: DB tests on 120 dishes (duplicate names, tied averages/prices, unrated, unknown prices, one retired): all three sorts equal an independent comparator across pages of 50/50/19. Chrome on the development fixture: each sort walks pages 50/50/20 via Next with 120 unique dishes and ordering holds across page boundaries.
- D4: unit tests for invalid sort/page/category fallbacks and URL round trip. Chrome: changing sort on page 2 → `?sort=price` (page reset); dropdowns apply immediately; refresh keeps q/category/sort; Back restores the previous URL and control values; page past end offers page 1; invalid params → 200 with defaults.
- Chrome at 390/320 px: no overflow, all targets ≥ 44 px, no console errors (a duplicate sibling key was found and fixed during testing).
Database/auth impact: one additive read-only function; no table or policy changes. restaurant_menu is now unused by the app; drop it in a later migration once production runs this slice.
Remaining issues: real-phone check; Vercel preview check; apply 202609230002 to forkdprod before merging; remove the development fixture after the preview check.

## Production database switch — 2026-09-23

- Created forkdprod (mlmcfssynaqqofadraxe). `supabase db push` applied 202609220001 and 202609220002; seed dry-run → 110 creates; apply → 10 locations / 100 dishes; second apply → all unchanged.
- Development migration history repaired to mark 202609220001–0002 applied (schema verified present first; no schema change).
- forkdprod Auth: Site URL https://forkdmvp.vercel.app; allowlist only https://forkdmvp.vercel.app/auth/callback.
- Vercel Production NEXT_PUBLIC_SUPABASE_* now point at forkdprod; Preview stays on development. Redeployed; live restaurant IDs exist only in forkdprod.
- Owner accounts from development do not exist in production.
- Open: development Auth allowlist lacks http://localhost:3000/auth/callback; Vercel Production still holds unused SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY (development keys) and should drop them.

## Slice 2 evidence — 2026-09-23

Slice and acceptance IDs: 2 / M1–M3.
Files changed and reason: supabase/migrations/202609230001_dish_detail.sql (SECURITY DEFINER single-dish projection with aggregate, fixed search_path, execute-only grants, returns retired rows, no identity fields); src/lib/catalog.ts (getMenu via restaurant_menu, getDish via dish_detail); src/lib/format.ts (display-only half-up score rounding, counts, "Price unavailable", dates); src/app/restaurants/[restaurantId]/page.tsx (menu in Suspense after the 404 check); src/app/dishes/[dishId]/page.tsx; src/app/score-badge.tsx; database.types.ts (hand-maintained: generated types mark RPC columns non-null); tests; README (database table, migration commands, routes).
Commands and actual outcomes: lint, typecheck, `npm test` (53/53), build: pass. `supabase db push` of 202609230001 to development: applied.
Checks:
- M1: menus list only active dishes (DB test: retired dish leaves restaurant_menu). Fat Daddy's shows 10 dishes, each "Price unavailable"; all dishes "No ratings yet"; no image slots (no approved photos).
- M2: isolated DB tests: 8.0 + 10.0 → 9.0 / 2 via restaurant_menu and dish_detail; Top Rated order Delta(9.5/2), Alpha(9/2), Bravo(9/1), Charlie(9/1), Foxtrot(3/1), then unrated Aardvark, Echo with null average and 0 count. Development: two labelled test accounts rated Bombay House "Saag Paneer" 8.0 and 10.0 → menu and dish page show 9.0 / 2 ratings and the dish moves from last to first; accounts and ratings deleted afterwards (development ratings: 0).
- M3: dish links open without login; retired dish still resolves with is_active false and rating history (DB test); unknown, malformed and quote-injection dish IDs → HTTP 404.
- Chrome at 390/320 px: no overflow, targets ≥ 44 px (inline restaurant name link on the dish page is duplicated by the 44 px back link), search → restaurant → dish → back works, no console errors.
- Vercel preview (slice-2-menu, development data, via `vercel curl`): Fat Daddy's menu 10 dishes with "Price unavailable"; dish page renders "No ratings yet"; malformed dish ID → 404.
Database/auth impact: one additive read-only function; no table or policy changes. Applied to development and, after the preview passed, to forkdprod (`supabase db push`; anon RPC call returns 200). CLI relinked to development.
Remaining issues: real-phone check.

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
