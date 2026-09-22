# Forkd product specification

## User and outcome

A diner already has a restaurant in mind and wants help choosing a dish. Forkd presents community dish averages alongside the menu. The MVP tests the usefulness of this loop with a small local catalog; it does not promise personalized advice or complete restaurant discovery.

## Required screens and routes

| Route | Public behavior |
|---|---|
| `/` | Search supported restaurants by name; blank query lists supported locations |
| `/restaurants/[restaurantId]` | Name, address, cuisine, menu coverage/source date, searchable ranked menu and restaurant share |
| `/dishes/[dishId]` | Dish, restaurant link, description/price/category, average/count, own-rating control when signed in, dish share |
| `/ratings/[ratingId]` | Saved individual score, dish and restaurant links, updated timestamp, no email or account ID |
| `/login` | Email magic-link request, pending/error/retry state |
| `/auth/callback` | Complete authentication, redirect to validated same-origin internal destination |

Use stable UUIDs in URLs. Slugs may be stored for later readability but must not be required for identity. Missing records return a friendly 404. Retired dishes remain linkable with “No longer on the current menu”; hide their new-rating control. Retired restaurants remain publicly readable but are excluded from search.

## Restaurant search

Trim whitespace, limit queries to 100 characters and match restaurant names case-insensitively by substring. Blank input shows supported restaurants alphabetically; display location/address to distinguish branches. Do not search dish names here. Show loading, retryable failure and honest “Not in Forkd yet” empty states. No request workflow is required. Label coverage as selected local restaurants, never “near you.”

## Menu view and discovery

Show active dishes with name, category, optional description, price/currency if known, community average to one decimal and rating count. A missing price means “Price unavailable,” not zero. An unrated dish shows “No ratings yet,” not 0/10. Use placeholders if no licensed photo is available; photography is optional.

Search matches name or description within this restaurant only. Category is a single selection, default All. Combine query AND category, then apply sort across the complete matching result set before pagination.

| Sort | Exact order |
|---|---|
| Top Rated (default) | Non-null raw average descending, count descending, name ascending, ID ascending; unrated last |
| Most Rated | Count descending, raw average descending with null last, name ascending, ID ascending |
| Price Low → High | Price ascending with null last, name ascending, ID ascending |

No minimum-count threshold or weighted score in v0.1; count remains visible so a one-rating dish is distinguishable. Preserve `q`, `category`, `sort`, and `page` in restaurant URL parameters. Reset page on control changes. Invalid parameters fall back safely. Provide clear-all and matching-result count. Bound results to 50 per page; sort/filter before paging, never only the visible page.

## Rating and authentication

Default decision: score 1.0 through 10.0 in 0.1 increments, with a labelled numeric control or accessible slider plus visible value. A submission must be a valid tenth, not silently rounded. Validate before database insertion (fixed-precision columns alone can round invalid input).

Logged-out visitors can browse and share. “Rate this dish” directs to email magic-link login and returns to the same dish; retain an unsaved score only locally and require an explicit submit after login. A persisted Supabase session supports refresh and sign-out. Handle expired/reused links and email delivery errors. No password system, social login or profile screen is needed.

One current rating per user per dish. First submit creates a record; later submit updates the same record/ID so count does not increase and shared links remain valid. Disable duplicate in-flight submissions. A failed save keeps the entered value and displays an error; do not show success until confirmed. Refresh own score, aggregate and menu ranking on successful save. Ratings on retired dishes cannot be created or edited. Rating deletion is deferred.

Tell users before submission: their score can be viewed publicly; account details are not displayed. Do not expose a public reviewer profile. Real production ratings only.

## Sharing — three required targets

- Restaurant share: name, short invitation, canonical restaurant URL.
- Dish share: dish + restaurant, current community score/count if any, canonical dish URL.
- My rating share: saved score labelled as an individual rating, dish + restaurant and canonical rating URL. Never substitute the community score for the person's score.

Offer my-rating sharing only after a successful save. Rating URLs show the current saved score and update date, not an immutable historical snapshot. A link must resolve in an incognito browser without login. No built-in friends, messaging or feed.

Use Web Share when supported and invoked by a user gesture. Otherwise copy a useful message and URL; provide a selectable link if clipboard access fails. Cancellation is not an error or a successful share. Give feedback only for completed sharing/copy actions. Use the configured app origin, never localhost in production. Each destination has server-rendered title/description and basic Open Graph metadata; custom image generation is unnecessary. External preview caches can lag after rating edits; the landing page must show the current value.

## Experience and learning

Loading, empty, invalid URL, offline/network failure and retry states belong to each slice. Aim for tap targets at least 44px, labelled controls, visible focus, readable contrast and no horizontal scroll at 390px. Test 320px and desktop layouts too. Validate with a few first-time testers; record whether they can complete the loop and find the ranked menu useful. No analytics product is needed to observe the demo.
