# MVP acceptance criteria

All checks are pending. Mark each with evidence in PROJECT_STATUS.md. Required feature tests must pass on production, not only in local mocks.

## Foundation

- [ ] F1: Local Next.js app and Vercel preview render real Supabase catalog data; setup is reproducible from recorded versions/migrations.
- [ ] F2: Email sign-in, callback, refresh and sign-out work; expired link and delivery failure have usable recovery; return path cannot redirect off-site.
- [ ] F3: 10–20 verified real local restaurants, approximately 10–30 selected dishes each, have source URLs/dates. No fictional production rows/ratings.
- [ ] F4: Seed dry-run shows changes; two applies preserve IDs/counts/ratings; an invalid file causes no partial restaurant import.

## Restaurant search and menu

- [ ] R1: Partial and mixed-case names find the correct location; blank query lists supported locations; dish-name-only terms do not implement global dish search.
- [ ] R2: A result opens the correct stable restaurant URL; address distinguishes duplicate brand names.
- [ ] R3: No matches, overlong query, loading and failed request are handled; unknown restaurant ID returns 404.
- [ ] M1: Menu shows only active dishes and correct factual fields, with optional-photo and unknown-price fallbacks.
- [ ] M2: With development scores 8.0 and 10.0, a dish shows 9.0 and count 2. Unrated dishes show count 0 and “No ratings yet.” Top-rated ties follow PRODUCT_SPEC.md.
- [ ] M3: Dish links open directly without login; retired dish links remain readable and cannot be rated; unknown dish ID returns 404.

## Menu discovery

- [ ] D1: Search matches names/descriptions only within the selected restaurant; whitespace/case and zero results work.
- [ ] D2: Category selection AND menu query narrow the same list; reset clears both.
- [ ] D3: Top Rated, Most Rated and Price Low → High order correctly, including nulls/ties; order is correct across page boundaries.
- [ ] D4: Refresh/back preserve URL controls; invalid controls safely default; controls reset page; large development menu fixtures demonstrate 50-item paging.

## Ratings and access

- [ ] T1: Logged-out rating request leads through login back to the same dish; explicit submission is still required.
- [ ] T2: Valid 1.0, 9.2 and 10.0 persist. Reject 0, 10.1, 9.25, NaN, blank and nonnumeric values server-side without silent rounding.
- [ ] T3: Updating 8.0 to 6.0 with another user's 10.0 changes average from 9.0 to 8.0, count stays 2 and rating ID remains stable. Refresh confirms state.
- [ ] T4: Concurrent/repeated submissions cannot create duplicates. Failure retains input and reports no false success; menu and dish aggregates refresh after save.
- [ ] T5: Anon writes fail. User B cannot read A's base row, edit it, change its user/dish IDs or alter catalog data. Public aggregate/rating projections expose no email, auth ID or token.

## Sharing

- [ ] S1: Restaurant and dish share actions emit correct production URLs/messages and resolve to correct public destinations in incognito.
- [ ] S2: My-rating sharing uses the saved personal score and rating URL; recipient sees that individual score, dish and restaurant without login. Editing updates the same URL.
- [ ] S3: Native share works where supported; unsupported browser uses copy; denied clipboard shows selectable link; share cancellation produces no false success.
- [ ] S4: Restaurant, dish and rating pages have server-rendered title/description/Open Graph metadata with production URLs. Never leak draft scores/account fields through metadata.

## Quality and release

- [ ] Q1: Full loop works at 390 × 844; 320px and desktop remain usable. Check a real mobile browser, not only viewport emulation.
- [ ] Q2: Controls have labels, keyboard access, visible focus and readable contrast; no horizontal scrolling; primary tap targets are at least 44px.
- [ ] Q3: Slow network, database outage, missing prices/images and long names have understandable UI. No per-dish aggregate request loop; bounded list queries and relevant indexes are present.
- [ ] Q4: Lint, typecheck, targeted tests and production build pass. Secrets are absent from repo/browser bundle; auth-specific content is not shared-cacheable.
- [ ] P1: Production env, Auth Site URL/redirect allowlist, migrations and real seed data match deployment. Preview uses a separate nonproduction project.
- [ ] P2: A new tester completes search → menu → filter/search/sort → dish → login/rate/edit → share on production; another logged-out browser opens all three target types.
- [ ] P3: Record deployment URL, commit, migration state, test evidence, known limitations and application rollback steps. No required feature is deferred or broken.

Release gate: all above checks pass. Optional imagery and growing from 10 to 20 restaurants may be omitted. Synthetic fixtures used for calculation tests must not be promoted into production.
