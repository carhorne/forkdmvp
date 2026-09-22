# Manual seed-data guide

## Launch target

Choose one local area based on where testers eat. Load 10 verified real restaurant locations on Day 1; expand to at most 20 on Day 6 only after the core loop works. Aim for 10–30 major dishes per location (roughly 100–600 dishes total). Select restaurants with enough menu information to make the MVP useful. Branches are separate records.

The included JSON is a fictional format example, not verified restaurant data. This bundle does not claim that real restaurants have already been researched or loaded. The initial city and list remain launch decisions.

## Sourcing workflow

1. Choose a restaurant and verify its exact location and official website.
2. Manually read its restaurant-owned menu page or restaurant-provided menu document. Do not build crawlers, scrapers, scanning/OCR, partner APIs or nationwide ingestion.
3. Record source URL and review timestamp. Follow source terms; use concise factual descriptions and only authorized photography. If sources conflict, resolve the branch/menu/date with the restaurant or omit the uncertain field.
4. Transcribe name, address, cuisine, optional price level, categories, dish names, brief descriptions and known prices into normalized JSON. Record unknown price as null. Never infer dietary/allergen guarantees.
5. Start with major dishes; omit modifiers, catering, combo builders and large variation trees. Select a clearly labelled size/version when necessary. Mark menu_coverage as selected unless the actual relevant menu is complete.
6. Review each JSON against the source before import. Check names, branch, currency, price units, duplicates and working URLs. Preserve a brief rights/source note separately if assets require it.
7. Validate then dry-run the import, inspect changes, apply to development, rerun and verify no duplicates. Apply verified production data through an explicit environment selection.

Restaurant-level source fields summarize the menu; dish-level source_url/source_checked_at inherit that source unless a separate source was consulted. Store null image_path unless an approved asset has been uploaded.

## Seed contract

See `seed/restaurant.example.json`. Keys mirror `DATA_MODEL.md`; nested menu rows become dishes with the resolved restaurant_id. Database-generated IDs/timestamps are not provided in seed JSON. A restaurant seed_key identifies a location permanently; dish seed_key identifies one dish within it. Never derive identity anew on every name edit. Slugs remain stable once linked.

The Slice 0 importer must:

- Validate all files before any writes; reject fictional markers in production, malformed URLs/dates, duplicates, negative/noninteger cents, invalid currencies, missing names or categories.
- Upsert restaurants by seed_key and dishes by (restaurant_id, seed_key); preserve UUIDs, created_at and existing ratings.
- Support dry-run and report create/update/retire counts, with an explicit target project. Do not log secrets.
- Apply each restaurant and its menu atomically, via a trusted transaction-capable path or narrowly controlled administrative RPC. A partial failure must not silently leave half a menu.
- Never delete or automatically retire omitted dishes, because these are selected menus. Retirement requires an explicit is_active=false row.
- Refuse production fixture ratings and keep any synthetic scores in a separate development-only fixture command.

`seed:validate`, `seed:dry-run`, and `seed:apply` are planned script names to implement, not commands already supplied by this bundle. The seed credential remains local/administrative, never in browser code or the normal rating request path.

## Data QA gate

Count 10–20 real locations, with approximately 10–30 useful dishes each. Every record has provenance and a review date. Check at least one menu per source format manually in the UI, and all imported names/prices against the reviewed input. Rerun import and verify IDs and row counts remain stable. Production starts with zero ratings unless real testers have submitted them. Display limited coverage and source age honestly; do not claim menus/prices are guaranteed current.
