# Provo launch catalog — source review

Manually reviewed and transcribed on September 22, 2026. Ten Provo locations, ten selected dishes per location. This is a selected catalog, not a full menu or guarantee of current prices. No restaurant reviews, ratings, marketing descriptions, dietary claims, or images were imported. All prices are USD cents; unknown prices are null. Every JSON includes the source URL and actual review timestamp.

| Location | Restaurant-owned menu | Location verification / scope |
|---|---|---|
| Black Sheep Cafe | https://www.blacksheepcafe.com/provo | Same page: 19 N University Ave. Selected lunch entrees and soups. |
| Bombay House | https://bombayhouse.com/order | Same page: 463 N University Ave. Selected chicken, lamb, and paneer dishes; omitted allergy markers. |
| Communal | https://www.communalrestaurant.com/menu | https://www.communalrestaurant.com/location: 102 N University Ave. Selected brunch and lunch dishes; availability varies by service. |
| Station 22 | https://www.station22cafe.com/menu | https://www.station22cafe.com/: 22 W Center St. Selected brunch dishes; extras excluded. |
| MOZZ Sourdough Pizza | https://www.mozzartisanpizza.com/provo | Same page: 145 N University Ave. Selected standard artisan pizzas. |
| Silver Dish Thai Cuisine | https://silverdishthaicuisine.com/ | Same page: 278 W Center St. Chicken chosen explicitly for configurable dishes at the listed base price. |
| Spicy Thai | https://www.spicythaiutah.com/menu.html | https://www.spicythaiutah.com/: 3230 N University Ave. Chicken chosen explicitly; optional pineapple/pumpkin/protein upgrades excluded. |
| Fat Daddy's Pizzeria | https://fatdaddyspizzeria.com/menu/ | https://fatdaddyspizzeria.com/: 223 W Center St. Signature pizza names only; size-specific prices were not shown on this page, so prices are null. |
| ABG's Libation Emporium | https://abgsbar.com/mobile-menu | Same page: 190 W Center St. Selected burgers and sandwiches; side/extra charges excluded. The site gives no menu publication date; review date means page inspection only. |
| India Palace | https://indiapalaceprovo.hrpos.heartland.us/menu | Official Provo menu linked from https://indiapalaceprovo.com/; browser verified 98 W Center Street. Selected fixed-price main dishes. Configurable dishes displayed as $0 before protein selection were omitted, not imported as free. |

Identity keys and slugs were assigned once for this initial dataset. Preserve them on later corrections. Names and prices were checked against the displayed official menu content. Short category labels normalize typography; descriptions remain null. Source pages may change after review. Restaurant confirmation and real-phone inspection are still manual release checks.

## Expansion — September 24, 2026

Ten additional Provo locations, 107 selected dishes; combined catalog: 20 locations / 207 dishes. Manually read and transcribed from the pages below. Existing seed files and identities are unchanged. No scores, reviews, photos, marketing copy, or dietary guarantees imported. Dates mean source inspection, not a restaurant's publication date. Online prices can differ from dine-in and may change.

| Location | Menu source | Verification and selection |
|---|---|---|
| Wariqe Peruvian Food | [Restaurant-run Toast menu](https://www.toasttab.com/local/order/wariqe-peruvian-food-18-n-university-avenue-i/item-t_8202c30e-f013-41c2-ac6c-55d2bda68494) | [Official site](https://www.wariqeperuvianfoodut.com/) confirms 18 N University Ave and spelling “Wariqe.” The cited item page exposes the full menu; 10 Criollos selected. Prices differ across ordering channels, so all prices are null pending confirmation. |
| K's Japanese Kitchen | https://ksjapanesekitchen.com/menu/ | Official home page confirms 322 W Center St. Twelve regular Domburi dishes. Menu's $11.50 regular price applies except the explicitly priced Yakiniku/Katsu Curry ($13.50) and Sukiyaki ($15.50). No small/XL or custom upgrades. |
| El Gallo Giro | https://www.doordash.com/store/el-gallo-giro-provo-183419/18615923/ | Owner explicitly authorized this DoorDash source in this task because the former official domain is unavailable. 346 N University Ave also confirmed by the [same store's DoorDash storefront](https://order.online/store/el-gallo-giro-n-university-ave-183419). Seven burritos and three entrees; prices from the live DoorDash delivery menu, including Bean & Cheese Burrito $9.06. No marketplace ratings or descriptions imported. website_url is null rather than a dead/parked domain. |
| Guru's Cafe | https://guruscafe.com/locations/provo-center/menu | Official menu redirects to the Provo Center Street branch, 45 E Center St. Ten breakfast dishes, not an all-day availability claim. Excluded build-your-own and optional add-ons. |
| Sage Pizza | https://www.sagepizza.org/menu | Same page and official home page confirm 671 E 800 N. Fifteen named pizzas; no prices displayed, so null. No inferred size or prices from the former Slab business. |
| CHOM Burger | https://www.chomburger.com/menu | Official home page confirms the Provo branch at 45 W 300 N (not American Fork). Eight burgers and two chicken sandwiches; CHOM explicitly uses the No Cheese version at $8. Excluded monthly specials and upgrades. |
| Five Sushi Brothers | https://fivesushibrothers.com/menu/ | Official home page and menu body confirm 445 N Freedom Blvd. Ten named sushi rolls at standard listed prices, not weekday/happy-hour discounts. Ignored the menu page's leftover generic New York footer template. |
| La Dolce Vita Ristorante Italiano | https://ladolcevitaprovo.com/menu/ | Same page confirms 61 N 100 E. Nine entrees and Lasagna; no lunch specials or configurable Spaghetti. |
| Thai Papaya Cuisine | https://thaipapayaprovo.cloveronline.com/menu/all | [Official menu page](https://thai-papaya-cuisine-provo-8.webnode.page/menu/) links to Clover; live browser verified restaurant name, phone and location. 1774 N University Pkwy Suite 28. Nine named protein-specific entrees and Tom Kha Gai; no configurable curry/noodle prices inferred. Clover displayed online prices transcribed exactly. |
| Quiero Más | https://order.toasttab.com/online/quieromas | Restaurant-operated Toast storefront identifies 155 North University Avenue, Provo. Nine fixed-price main dishes and Esquite. Excluded sold-out items, customizable $0 placeholders, and unspecified protein selections. |

All additions are `menu_coverage=selected`, descriptions/images/price levels remain null, currency USD. Stable identity keys assigned once. Import uses the existing administrative transaction per restaurant; no schema, RLS, authentication, or backfill changes. No automatic retirement of omitted dishes.
