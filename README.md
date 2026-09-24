# Forkd MVP project context

**Know what to order.** A one-week, mobile-first Next.js web MVP for finding a supported restaurant, browsing its ranked menu, rating a dish, and sharing a useful link.

Slice 0 implementation is in progress. The repository now contains the Next.js app, SQL migrations, authentication, seed tools, and isolated database tests. See PROJECT_STATUS.md for actual acceptance evidence and remaining hosted checks.

## Run locally

Use Node 24 (`nvm use`) and npm 11.6.2. Exact dependencies are recorded in package-lock.json. A project-local Node 24 runtime is also installed for this workstation's tests.

```sh
npm ci
cp .env.example .env.local  # only if .env.local does not already exist
npm run dev
```

Fill `.env.local` privately. Public browsing and sign-in use the Supabase URL and publishable key. APP_URL is the trusted origin used for auth callbacks. The secret key is only for local seed administration, never Vercel. With no configured database, the app shows an honest preparation state; it never substitutes fictional catalog data.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The database tests run the actual SQL migrations on PGlite's PostgreSQL engine with isolated anon/user A/user B roles. They do not contact, reset, or seed a hosted project. Hosted Supabase/email/browser checks are additional acceptance requirements. Webpack is explicitly selected because this workstation's Turbopack worker cannot bind its required port.

## Databases and migrations

| Supabase project | Ref | Used by |
|---|---|---|
| Development | `tvyzezmbyqszscldrqvi` | Local `.env.local`, Vercel Preview; labelled test data allowed |
| Production (forkdprod) | `mlmcfssynaqqofadraxe` | Vercel Production; verified seed and real ratings only |

Both projects track migrations in Supabase's history table. Apply new files in `supabase/migrations/` with the Supabase CLI, development first, then production after checks pass. Keep the CLI linked to development by default. Database passwords live in the git-ignored `.env.db.local` (`SUPABASE_DEV_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD`):

```sh
npx supabase login
set -a; source .env.db.local; set +a
SUPABASE_DB_PASSWORD="$SUPABASE_DEV_DB_PASSWORD" npx supabase db push --linked --dry-run   # then without --dry-run
# Production: link, push, then relink development.
SUPABASE_DB_PASSWORD="$SUPABASE_PROD_DB_PASSWORD" npx supabase link --project-ref mlmcfssynaqqofadraxe
SUPABASE_DB_PASSWORD="$SUPABASE_PROD_DB_PASSWORD" npx supabase db push --linked
SUPABASE_DB_PASSWORD="$SUPABASE_DEV_DB_PASSWORD" npx supabase link --project-ref tvyzezmbyqszscldrqvi
```

Never reset either database. Do not apply migrations as a web-build side effect.

The seed import RPC is service-role-only and atomic per restaurant. The public read RPCs intentionally bypass ratings RLS only for bounded, identity-free projections. Raw ratings remain owner-only. Score uses `numeric` plus an exact-tenths CHECK to avoid silent rounding.

`src/lib/supabase/database.types.ts` is maintained by hand and updated with each migration: `supabase gen types` marks every RPC result column non-null, which would hide null averages and unknown prices.

## Reviewed seed data

See SEED_DATA_GUIDE.md. Only files in `seed/verified/` are imported by default; the fictional format example is excluded and rejected by validation. All files are validated before writes. Missing dishes are preserved; retirement requires explicit `is_active: false`. Stable slugs and seed keys cannot change. Unknown prices are null, with no fabricated ratings or photography.

```sh
npm run seed:validate -- --target development
npm run seed:dry-run -- --target development --project-ref tvyzezmbyqszscldrqvi
npm run seed:apply -- --target development --project-ref tvyzezmbyqszscldrqvi
```

Set `SEED_TARGET=development` in the selected local environment file. Production requires a separately configured `--env-file`, matching `SEED_TARGET=production`, and an explicitly matching `--project-ref`. A restaurant failure rolls that restaurant back; prior completed restaurants remain applied and safe to rerun. Dry-run reports create/update/retire/unchanged counts.

### Development fixture

For checking paging and sort orders on hosted data, `fixture:dev` creates one clearly labelled 120-dish "Forkd Test Kitchen — development fixture" with three `forkd-dev-fixture-*@example.com` test accounts and their ratings. It refuses to run unless `--project-ref` matches the environment URL and `SEED_TARGET=development`. It is safe to rerun; remove it when done.

```sh
npm run fixture:dev -- create --project-ref tvyzezmbyqszscldrqvi
npm run fixture:dev -- cleanup --project-ref tvyzezmbyqszscldrqvi
```

## Vercel

Project `forkdmvp`, Next.js preset, Node 24. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are non-sensitive: Production points at forkdprod, Preview at development. `APP_URL` is `https://forkdmvp.vercel.app` for Production. Do not add `SUPABASE_SECRET_KEY`. Redeploy after environment changes; public values are built into the bundle.

## Sign-in

Passwordless email: one email carries a code and a link. Both are verified on the server with `verifyOtp` (no PKCE verifier cookie), so they work in whichever browser or device opens the email, including mail apps' in-app browsers. The link opens `/auth/confirm`, which signs in only after a tap so mail scanners cannot use up the token. `/auth/callback` remains for older PKCE emails.

Per Supabase project (Authentication settings):

- Email templates "Magic Link" and "Confirm signup": body from `supabase/templates/sign-in.html`, subject `Your Forkd sign-in code: {{ .Token }}`.
- Site URL: the app origin without a trailing slash. Redirect allowlist: `<origin>/auth/confirm**` (plus `<origin>/auth/callback` for older emails).
- Production email: custom SMTP through a Gmail account (`smtp.gmail.com`, port 465, the Gmail address as user, a Google App Password), sender name Forkd; email rate limit raised from the built-in 2/hour. Swap to a domain-based provider (e.g. Resend) once a domain exists.

Rollout order: deploy the app first (so `/auth/confirm` exists), then change the templates and allowlist.

Routes so far: `/` (restaurant search), `/restaurants/[restaurantId]` (restaurant and ranked menu; `q`, `category`, `sort` = `top`|`most`|`price`, `page`), `/dishes/[dishId]` (dish, community rating and the viewer's own rating control), `/login`, `/auth/callback`. Ratings are saved through the `save_rating` RPC (SECURITY INVOKER; session user only; RLS enforces ownership and active dishes). Sharing is a later slice.

## File map

| File | Purpose |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Seven-day schedule, slice dependencies, scope and gates |
| [AGENTS.md](AGENTS.md) | Persistent Codex engineering instructions |
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Screens, rating rules, discovery and sharing behavior |
| [DATA_MODEL.md](DATA_MODEL.md) | Tables, constraints, access boundaries and aggregates |
| [SEED_DATA_GUIDE.md](SEED_DATA_GUIDE.md) | Manual menu sourcing, normalization and import contract |
| [MVP_ACCEPTANCE_CRITERIA.md](MVP_ACCEPTANCE_CRITERIA.md) | Testable release checklist |
| [ENVIRONMENT.md](ENVIRONMENT.md) | Local setup, secrets and Vercel deployment |
| [.env.example](.env.example) | Placeholder environment settings |
| [CODEX_START_HERE.md](CODEX_START_HERE.md) | Small plan/build/review prompts |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Compact handoff and evidence log |
| [DECISIONS_AND_SOURCES.md](DECISIONS_AND_SOURCES.md) | Blueprint mapping, assumptions and sources |
| [seed/restaurant.example.json](seed/restaurant.example.json) | Fictional format example; never production seed |

## Definition of success

A new tester can use a phone to search a supported restaurant, view and refine its menu, choose a dish, sign in to rate it, edit that rating, and share a restaurant, dish, or saved rating that opens without login. Launch with 10–20 verified local restaurants and roughly 10–30 selected dishes each. Clearly label partial menus and limited coverage.

Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres/Auth, optional Supabase Storage for approved assets, Vercel. Use Supabase SQL migrations and its client libraries; no separate API service or ORM is needed for this plan.
