# Forkd project status

Status: Slice 4 implemented; T1–T5 pass in DB/unit tests and against development with test sessions. Owner's real email round trip for T1 pending. Slice 0 F2 mobile/sign-out/expired-link checks still open.
Current slice: 4 — Ratings (plan approved; implementation complete).
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
| 4 Ratings | Owner email check + real-phone check pending | T1–T5 pass in DB/unit tests, in Chrome against development with two test sessions, and via direct API calls; see Slice 4 evidence. |
| 5 Sharing | Pending | — |
| 6 Integration/release | Pending | — |

## Latest handoff

- Accepted product scope: six features in ROADMAP.md; 10–20 manually verified local restaurant menus.
- Default decisions: 1.0–10.0 tenths; one editable rating/user/dish; passwordless email sign-in by code or link (changed 2026-09-23 from PKCE magic links, which failed whenever the email opened in a different browser); public saved-rating links without account identity; selected menus labelled honestly.
- Next action: owner tests the real magic-link rating round trip and phone layout, merge slice-4-ratings, then the sign-in improvements (email code + custom SMTP), then plan Slice 5 (sharing).
- Release blockers: F2 remaining checks (now testable: 30 emails/hour through Gmail), preview APP_URL, Slices 5–6.
- Sign-in improvements done (code + any-browser link, Gmail SMTP). Swap Gmail for a domain-based provider (e.g. Resend) once a domain is bought.

## Sign-in fix — 2026-09-23

Problem: production logs showed every attempt as POST /login → GET /auth/callback about 10 s later → GET /login (error). The PKCE magic link needs a verifier cookie from the requesting browser; mail apps open links in a different (often in-app) browser, so exchange always failed. Separately, the built-in sender allows 2 emails/hour per project.
Change: one email with a code and a link, both verified server-side with verifyOtp (email+code, or token_hash). New /auth/confirm page needs a tap before verifying (scanner-safe) and derives the return path only from a same-origin redirect_to. Login shows a code step with resend and change-email; auth errors are mapped (429/over_* → wait message). supabase/templates/sign-in.html is the shared template. No database changes.
Checks (development, admin-generated tokens so no email was sent; test user deleted afterwards): code — wrong code rejected, correct code creates the @supabase/ssr session cookie, reuse rejected; development codes are 8 digits, so copy says "code" and parsing accepts 6–10 digits. Link — opened in a fresh browser that never requested it: confirm page does not sign in until tapped, then lands on /dishes/<id>#rate signed in with "Save rating"; reused link → /login?error=link with recovery text; a scanner-style visit does not consume the token; bogus token → login error; wrong type → "This link isn’t complete"; foreign-origin redirect_to → lands on /. Unit tests for code, token, type and redirect parsing. lint, typecheck, `npm test` (153/153), build: pass. 390/320 px: no overflow, targets ≥ 44 px, no console errors.
Configuration applied 2026-09-24 via the Supabase Management API (personal access token in .env.db.local). Free-tier projects reject template edits on the built-in sender, so custom SMTP had to be set first.
- forkdprod: SMTP smtp.gmail.com:465 as forkd.app.official@gmail.com (Google App Password), sender "Forkd", email limit 2/h → 30/h; Magic Link and Confirm signup use supabase/templates/sign-in.html with subject "Your Forkd sign-in code: {{ .Token }}"; allowlist https://forkdmvp.vercel.app/auth/confirm** and /auth/callback; Site URL unchanged. All values read back correctly.
- development: same SMTP, limit and templates; Site URL http://localhost:3000; allowlist localhost /auth/confirm** and /auth/callback plus the existing forkdmvp-carhorne preview patterns (closes the missing-localhost item).
- Test send through development to the Forkd Gmail address: /otp 200 in development auth logs (a Gmail rejection would fail the request). This created a development-only user for that address.
- Codes are 8 digits in both projects (mailer_otp_length 8).
Remaining: owner's real-email test on production (type the code, and tap the link on the phone); the Gmail account's daily sending limit (~500) now caps sign-in emails across both projects.

## Slice 4 evidence — 2026-09-23

Slice and acceptance IDs: 4 / T1–T5.
Files changed and reason: supabase/migrations/202609230003_save_rating.sql (SECURITY INVOKER upsert on the (user_id, dish_id) key; user from auth.uid(); authenticated-only execute; all existing RLS, column grants, CHECK and identity trigger apply); src/lib/score.ts (strict text tenths, no rounding); src/app/dishes/[dishId]/actions.ts (session check, RPC, error mapping, revalidate dish and restaurant pages); rating-form.tsx (slider + number box, public-score notice, draft kept only in localStorage for 1 hour, explicit submit, pending/disabled, error keeps input, network failure caught); dish page (own rating via RLS, closed state for retired dishes); catalog getOwnRating; database types; tests/ratings.test.ts, tests/score.test.ts; README.
Commands and actual outcomes: lint, typecheck, `npm test` (132/132), build: pass. `supabase db push` of 202609230003 to development: applied.
Checks (development, two temporary password test accounts signed in via real @supabase/ssr session cookies; accounts and ratings deleted afterwards, development ratings back to 0; harness not committed):
- T1: logged out, set 8.4 → "Sign in to rate" → /login?next=/dishes/<id>#rate; returning signed in restores 8.4 with a "press Save" note and no row exists; Save → row 8.4; draft cleared. The email hop itself is the owner's manual check.
- T2: DB tests reject 0, 10.1, 9.25, NaN, ±Infinity, -1, null and keep rows unchanged; 1.0, 9.2, 10.0 persist exactly. Unit tests cover 30 accepted/rejected strings. Browser with client validation removed: 9.25, 0, 10.1, NaN, abc, blank → server message, row unchanged; 1.0, 9.2, 10.0 save with the same rating ID.
- T3: A 8.0 + B 10.0 → dish shows 9.0 / 2; A updates to 6.0 → 8.0 / 2; A's rating ID unchanged; refresh confirms; restaurant menu shows the dish first at 8.0.
- T4: DB test and 10 concurrent API saves with A's JWT → one row, one ID, no errors. Aborted request → "We couldn’t reach Forkd…", input 7.7 kept, no row change, no success. Button disabled with "Saving…" while in flight. Menu and dish aggregates refresh after save.
- T5: DB tests plus live API: anon save_rating/insert → 42501, anon ratings read denied; B cannot read or update A's row, cannot insert as A or edit catalog; A cannot change user_id/dish_id; public dish projection has no user/email/token fields. Retired dishes reject new and edited ratings (DB tests) and the page hides the control.
- Chrome at 390/320 px signed in and out: no overflow, all targets ≥ 44 px, no console errors.
- Vercel preview (slice-4-ratings, via `vercel curl`): dish page renders the signed-out form (slider, number box, public-score notice, "Sign in to rate"). Signing in on previews is not possible until preview APP_URL is set.
Database/auth impact: one additive SECURITY INVOKER function; no table or policy changes. Applied to development and, after the preview passed, to forkdprod (anon call → 401 "permission denied for function save_rating"; production ratings: 0). CLI relinked to development.
Remaining issues: owner's real email round trip; real-phone check. Local dev must be opened as http://localhost (Next.js blocks dev resources for 127.0.0.1 unless allowedDevOrigins is set).

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
- Vercel preview (slice-3-discovery, via `vercel curl`): "  CHICKEN " → 5 matches; category + "masala" → Chicken Tikka Masala; fixture page 3 for each sort → showing 101–120, Page 3 of 3, 20 rows; invalid params → page 1; past-end page handled.
Database/auth impact: one additive read-only function; no table or policy changes. Applied to development and, after the preview passed, to forkdprod (anon RPC "masala" at Bombay House → 3). CLI relinked to development. Development fixture removed afterwards (development back to 10 restaurants; fixture accounts deleted). restaurant_menu is now unused by the app; drop it in a later migration once production runs this slice.
Remaining issues: real-phone check.

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
