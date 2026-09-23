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

## Vercel

Project `forkdmvp`, Next.js preset, Node 24. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are non-sensitive: Production points at forkdprod, Preview at development. `APP_URL` is `https://forkdmvp.vercel.app` for Production. Do not add `SUPABASE_SECRET_KEY`. Each Supabase project's Auth allowlist must contain the exact `/auth/callback` URLs it serves. Redeploy after environment changes; public values are built into the bundle.

Routes so far: `/` (restaurant search), `/restaurants/[restaurantId]` (restaurant and ranked menu), `/dishes/[dishId]`, `/login`, `/auth/callback`. Menu discovery controls, rating UI and sharing are later slices.

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
