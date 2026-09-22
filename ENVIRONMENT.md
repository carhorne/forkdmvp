# Environment and deployment guide

Slice 0 app and dependencies now exist; actual commands are in README.md. Use Node 24 and npm 11.6.2 with the committed lockfile. Hosted configuration and verification remain tracked in PROJECT_STATUS.md.

## Local and service setup

1. Create a Next.js App Router + TypeScript app in the project root, preserving these documents. Add Tailwind if desired and minimal accessible components.
2. Use Supabase client libraries for Postgres/Auth and the official SSR integration for cookie-based sessions. Create separate development and production Supabase projects. No custom password hashing or separate backend service.
3. Add SQL migrations for DATA_MODEL.md, enable RLS, and implement/test ownership and public projections before real users. Keep administrative seed access separate.
4. Copy `.env.example` to `.env.local`, fill settings privately, and keep it ignored by Git. The seed utility must explicitly load its environment; standalone scripts should not assume Next.js loaded it for them.
5. Configure email magic links, a trusted Site URL and explicit redirect allowlist entries for local, stable preview and production `/auth/callback` URLs. Verify real email delivery early; use suitable sender configuration for testers. Validate redirect targets in application code too.
6. Implement and document the seed scripts, then import reviewed menus into development. Run and inspect the complete database-backed path.

## Variables

| Name | Use / visibility |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Project URL; intentionally browser-visible |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public client key; authorization still depends on RLS |
| APP_URL | Server-side canonical site origin, local or deployed HTTPS origin |
| SUPABASE_SECRET_KEY | Optional privileged key for trusted local seed tool only; never browser/runtime user requests |

No privileged key is needed in Vercel for ordinary app reads/writes. If the project uses a legacy key, map the chosen public/privileged key variables deliberately and document the choice; do not mix credentials from different projects. Never prefix a privileged key with NEXT_PUBLIC. Client components can receive server-generated share URLs instead of a second public origin variable.

Public Next.js environment values are bundled for the client at build time; rebuild after changes. See [Next.js environment guidance](https://nextjs.org/docs/app/guides/environment-variables). Use the [Supabase Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs) for current session integration rather than copying a stale middleware recipe.

## Storage

Optional: create a curated menu-images bucket for approved restaurant/dish assets. Public reads are acceptable for public menu imagery; permit writes only through trusted administration. Store object paths, use optimized/resized images and show a fallback. Do not implement user uploads, camera permissions or photo reviews. The MVP can launch without Storage assets.

## Planned project commands

During scaffolding provide `dev`, `build`, `start`, `lint`, `typecheck`, and a targeted test command in package.json. Implement `seed:validate`, `seed:dry-run`, `seed:apply` separately. Document actual commands in README after they exist; do not treat this context bundle as executable scaffolding.

## Vercel checklist

- Connect the application repository, use the Next.js preset, and select a Node version compatible with the chosen Next.js version.
- Set Preview environment values to development Supabase and Production values to production Supabase. Use a stable test deployment URL for auth callbacks; do not broadly allow unrelated redirect origins.
- Deploy a preview on Day 1. Verify login, cookie/session refresh, public URLs and server access to Supabase.
- Apply reviewed migrations to production using an administrative process, then load verified seed data. Neither action runs automatically as an unreviewed side effect of every web build.
- Set APP_URL to the final HTTPS origin and Auth Site URL/redirect entries to match. Rebuild/deploy and run all production acceptance checks.
- Keep user/session responses uncached across users; revalidate public aggregate content after rating updates. Inspect logs without printing secrets or auth links.
- Record deployed commit and migration state. An application rollback uses a prior compatible deployment; database rollback requires a reviewed forward fix or recovery plan. Do not assume rolling back Vercel reverses schema changes.

Sources: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
