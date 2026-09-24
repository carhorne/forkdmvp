# Forkd MVP release record

**Live site:** https://forkdmvp.vercel.app (Vercel project `forkdmvp`, production branch `main`)
**Release:** v0.1 MVP, Provo, Utah, 10 hand-checked restaurants
**Released commit:** the `main` merge of `slice-6-release`. Record the hash from `git log -1 origin/main` after merging.
**Previous production commit:** `c57fed1` (Slice 5 merge), the rollback target if needed.

## What is live

All six required features: restaurant search; ranked menus; menu search, category filter and three sorts with paging; dish pages; signed-in 1.0–10.0 ratings (one per person per dish, editable); and sharing for restaurants, dishes and saved ratings. Sign-in is passwordless: one email carries a code and a link, and either works in any browser or device.

## Environments

| | Production | Development |
|---|---|---|
| Supabase project | forkdprod `mlmcfssynaqqofadraxe` | `tvyzezmbyqszscldrqvi` |
| Used by | Vercel Production | Local dev, Vercel Preview (browse-only), e2e tests |
| Data | 10 reviewed restaurants / 100 dishes; real users' ratings only | Same seed; labelled test data allowed, removed after use |
| Auth email | Gmail SMTP (forkd.app.official@gmail.com), 30/hour | Same |
| Site URL / allowlist | `https://forkdmvp.vercel.app`; `/auth/confirm**`, `/auth/callback` | `http://localhost:3000`; localhost + preview patterns |

## Database migration state (both projects, all applied)

| Migration | Purpose |
|---|---|
| 202609220001_foundation | Tables, RLS, grants, identity trigger, public_rating |
| 202609220002_seed_import | Atomic, service-role-only seed import |
| 202609230001_dish_detail | Public single-dish projection with aggregate |
| 202609230002_menu_page | Filtered, sorted, paged menu projection |
| 202609230003_save_rating | SECURITY INVOKER create-or-update of the caller's rating |
| 202609240001_drop_restaurant_menu | Removes the unused Slice 2 menu function |

Every migration is additive or removes unused code; none rewrites data. Check with `supabase migration list --linked` (see README for per-project commands).

## Evidence

Acceptance evidence for F1–F4, R1–R3, M1–M3, D1–D4, T1–T5 and S1–S4 is in `PROJECT_STATUS.md`, one section per slice; Q1–Q4 and P1 are in its Slice 6 section. Repeatable checks:

- `npm run lint`, `npm run typecheck`, `npm test` (unit and database tests on a real PostgreSQL engine), `npm run build`
- `npm run test:e2e`: full journey (phone and desktop), WCAG 2.1 AA scan, 320 px layout and keyboard-only checks against a local dev server and the development project, using temporary test accounts that are deleted afterwards

## New-tester check (P2) — production, real phone

Give this to someone who has not used Forkd. They use their own email and phone.

1. Open https://forkdmvp.vercel.app. Search part of a restaurant name (e.g. "thai"). Open a result.
2. On the menu: search a word (e.g. "chicken"), pick a Category, change Sort, then "Clear search and filters".
3. Open a dish. Move the slider or type a score, then tap **Sign in to rate**.
4. Enter an email, tap **Email me a code**. Open the email (subject "Your Forkd sign-in code: …"). Either type the code, or tap the link and then **Sign in to Forkd**.
5. Back on the dish, the chosen score is filled in. Tap **Save rating**, then change it and tap **Update rating**. The community rating updates, and the count does not go up on the edit.
6. Tap **Share my rating**, **Share this dish**, and **Share this restaurant** (on the restaurant page). Send each to yourself.
7. On a different browser or device where you are **not** signed in, open all three shared links. The rating link shows your individual score, the dish and the restaurant.
8. On the home page tap **Sign out**. Then try an old or already-used code or link: it should say it expired and offer a new code.

Record: tester, device and browser, date, pass/fail per step, anything confusing.

## Known limitations

- 10 restaurants in Provo; menus are selected, not full; no photos. Prices and menus can change after the recorded check date.
- Sign-in email goes through a Gmail account: about 500 emails a day across both projects, one request per address per 60 seconds, and codes are 8 digits. Move to a domain-based provider (e.g. Resend) once a domain is bought.
- Previews are browse-only: Preview has no `APP_URL`, so sign-in and share buttons do not work there (the owner chose this).
- A signed-out draft score is kept in that browser for one hour only.
- Link previews in chat apps can lag behind edits; the rating page itself always shows the current score.
- Rating deletion and account deletion are not offered (deferred by the spec).
- Vercel Production still holds unused variables from the Supabase integration and early setup, including the development project's Postgres password and JWT secret (`POSTGRES_*`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SEED_TARGET`). The app reads none of them and they never reach the browser; the owner chose to leave them. Removing them, or disconnecting the integration, would shrink what a Vercel-account compromise exposes.

## Rollback

- **App problem:** Vercel dashboard → forkdmvp → Deployments → the previous Production deployment (`c57fed1`) → **Instant Rollback**. Or `vercel rollback` from a linked checkout. This takes effect in seconds and needs no rebuild.
- **Database:** no automatic rollback. The current code needs `menu_page`, `dish_detail` and `save_rating`, which all remain. The only schema removal (`restaurant_menu`) is unused by every deployment since Slice 3, so rolling the app back to `c57fed1` or later is safe. For a database defect, write a reviewed forward-fix migration and apply it to development first, then production. Never reset either project.
- **Auth email:** if Gmail sending fails, set custom SMTP off in Supabase → Authentication → SMTP. The built-in sender resumes at 2 emails/hour, but free-tier projects then revert to Supabase's default templates (link only, same-browser). Fix SMTP rather than leaving it off.

## After release

- Revoke the Supabase personal access token (https://supabase.com/dashboard/account/tokens) and remove it from `.env.db.local`, or keep it only while making settings changes.
- Regenerate the Gmail App Password (four of its letters appeared in a local shell error during setup) and update both projects' SMTP settings.
- Optionally reset both database passwords (they were visible in a local editor session during setup).
