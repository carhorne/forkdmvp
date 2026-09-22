# Data model and access contract

Implementation design, not an applied migration. Use UUID primary keys, UTC timestamptz timestamps and server-maintained updated_at. Prefer SQL migrations under `supabase/migrations/` and generated TypeScript database types.

## Relationships

`auth.users 1 → many ratings`; `restaurants 1 → many dishes`; `dishes 1 → many ratings`.

Supabase Auth owns users and email. Do not duplicate passwords, create a custom User table or expose auth.users. A public profile table is unnecessary.

## Tables

| Table | Fields and constraints |
|---|---|
| restaurants | id UUID PK; seed_key text UNIQUE NOT NULL; name text NOT NULL; slug text UNIQUE NOT NULL; address, city, region, country text NOT NULL; cuisine text nullable; price_level smallint nullable CHECK 1–4; website_url text nullable; menu_source_url text NOT NULL; source_checked_at timestamptz NOT NULL; menu_coverage text CHECK selected/full NOT NULL; image_path text nullable; is_active boolean default true; created_at, updated_at |
| dishes | id UUID PK; restaurant_id UUID FK restaurants NOT NULL; seed_key text NOT NULL; name, slug, category text NOT NULL; description text nullable; price_cents integer nullable CHECK >= 0; currency char(3) NOT NULL; image_path text nullable; source_url text NOT NULL; source_checked_at timestamptz NOT NULL; is_active boolean default true; created_at, updated_at; UNIQUE(restaurant_id, seed_key); UNIQUE(restaurant_id, slug) |
| ratings | id UUID PK; user_id UUID FK auth.users NOT NULL; dish_id UUID FK dishes NOT NULL; score numeric(3,1) NOT NULL CHECK 1.0–10.0; created_at, updated_at; UNIQUE(user_id, dish_id) |

Set sensible length limits (name 200, category 80, description 2000) in input validation. Currency is an uppercase ISO currency code; a menu must use one currency for price sorting. Store minor units; seed examples assume USD cents. Validate currency handling if launch locale changes. No coordinates, embeddings, social edges or import-job tables.

Use ON DELETE RESTRICT for restaurant→dish and dish→rating; retire records through is_active. User deletion may cascade to that user's ratings. Account deletion UI is deferred; administrative removal must refresh aggregate results. Avoid mutable identity fields: seed_key and record ID survive spelling/price/category changes.

## Aggregates and public projections

Compute COUNT and AVG from ratings; do not store a hand-editable rating average on dishes. Empty average is NULL and count is zero. Group by dish_id in one query/view, left join to dishes, and round only for display. Keep raw average for sorting. Add ratings(dish_id) and dishes(restaurant_id, is_active, category) indexes. The unique user/dish constraint supplies an ownership lookup index. At 20 restaurants a bounded parameterized ILIKE name search is sufficient; add a trigram index only if measured query needs justify it.

Keep the base ratings table readable only by its owner. Implement two explicitly reviewed public read RPCs: a bounded restaurant-menu aggregate query, and a single-rating-by-ID projection returning rating ID, dish ID, score, updated_at plus public dish/restaurant data. Neither returns user_id or email. The dish-detail query can reuse a bounded aggregate helper. These RPCs must be narrowly scoped read-only functions with fixed search_path, fully qualified references, parameter validation, explicit grants and no arbitrary dynamic SQL. If SECURITY DEFINER is used to read aggregate/private base rows, review that bypass deliberately; never expose a generic privileged query endpoint. Revoke default PUBLIC execution and grant only required anon/authenticated access. Apply ordering/pagination inside the menu query.

An anonymous-by-identity public rating is a product decision: a saved score is public but its account identifier is private. Rating UUIDs are identifiers, not access-control secrets. No list-all-ratings or public user lookup API is required.

## RLS and permission matrix

Enable RLS on every exposed table. Treat database policy checks as mandatory even when the UI hides actions.

| Actor | Restaurants/dishes | Base ratings | Public projections |
|---|---|---|---|
| Anonymous | SELECT published catalog, including retired records for old links | No read/write | Read allowed public fields |
| Authenticated | Same catalog read, no catalog writes | SELECT own; INSERT/UPDATE own only | Same public reads |
| Trusted seed/admin process | Insert/update curated catalog | No routine seed writes | Operational only |

Rating INSERT requires auth.uid() = user_id and active dish + active parent. UPDATE needs USING and WITH CHECK ownership conditions and active targets. Prevent changing id, user_id or dish_id after insertion through column grants and/or a trigger; only score and server timestamp change. No client DELETE grant. Upsert on the unique user/dish key must update score only. Check both row ownership and active status in the database; server validation provides helpful errors.

Implementation decision (Slice 0): use unconstrained `numeric` for score with a CHECK for 1–10 and exact tenths (`score * 10 = trunc(score * 10)`). This intentionally replaces the table sketch's `numeric(3,1)` so even direct table writes cannot silently round 9.25 before validation. NaN and infinities fail the range check. Server input validation remains required when rating UI is built.

## Required verification

Use anon, user A and user B sessions. Prove B cannot read A's raw rating, update it, transfer its ownership or write catalog rows; prove anon cannot write. Public projections must still return correct average/count and saved rating score without identity fields. Concurrent first submissions yield one row. A repeat seed run preserves IDs, counts and links. No service/secret key may appear in browser requests or bundles.
