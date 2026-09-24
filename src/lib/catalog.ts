import "server-only";
import { createClient } from "@/lib/supabase/server";
import { MENU_PAGE_SIZE, type MenuParams } from "@/lib/menu-params";
import { isUuid, type RestaurantQuery } from "@/lib/search";

const SEARCH_LIMIT = 50;

// Active restaurants whose name contains the query; blank query lists all. One bounded request.
export async function searchRestaurants(query: Exclude<RestaurantQuery, { kind: "too-long" }>) {
  const client = await createClient();
  let request = client.from("restaurants")
    .select("id,name,address,city,region,cuisine,menu_coverage")
    .eq("is_active", true);
  if (query.kind === "name") request = request.ilike("name", query.pattern);
  const { data, error } = await request.order("name").order("id").limit(SEARCH_LIMIT);
  if (error) throw new Error("Restaurant search unavailable");
  return data;
}

// Public restaurant by stable ID, including retired ones so old links keep working. Null means 404.
export async function getRestaurant(id: string) {
  if (!isUuid(id)) return null;
  const client = await createClient();
  const { data, error } = await client.from("restaurants")
    .select("id,name,address,city,region,country,cuisine,website_url,menu_source_url,source_checked_at,menu_coverage,is_active")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("Restaurant unavailable");
  return data;
}

// One page of the filtered, sorted menu with aggregates, plus the total match count; one bounded RPC.
export async function getMenuPage(restaurantId: string, params: Pick<MenuParams, "q" | "category" | "sort" | "page">) {
  const client = await createClient();
  const { data, error } = await client.rpc("menu_page", {
    p_restaurant_id: restaurantId, p_query: params.q || null, p_category: params.category, p_sort: params.sort,
    p_limit: MENU_PAGE_SIZE, p_offset: (params.page - 1) * MENU_PAGE_SIZE,
  });
  if (error) throw new Error("Menu unavailable");
  return { dishes: data, total: data.length ? Number(data[0].total_count) : 0 };
}

// Distinct categories of the active menu, for the category control.
export async function getMenuCategories(restaurantId: string) {
  const client = await createClient();
  const { data, error } = await client.from("dishes").select("category")
    .eq("restaurant_id", restaurantId).eq("is_active", true).limit(1000);
  if (error) throw new Error("Menu unavailable");
  return [...new Set(data.map((d) => d.category))].sort((a, b) => a.localeCompare(b));
}

// The signed-in viewer's own rating for a dish (RLS returns only their row). Never cached across users.
export async function getOwnRating(dishId: string) {
  const client = await createClient();
  const { data: claims } = await client.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { signedIn: false as const, rating: null };
  const { data, error } = await client.from("ratings").select("id,score,updated_at").eq("dish_id", dishId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Your rating couldn’t load");
  return { signedIn: true as const, rating: data };
}

// Public dish by stable ID, including retired dishes so old links keep working. Null means 404.
export async function getDish(id: string) {
  if (!isUuid(id)) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("dish_detail", { p_dish_id: id });
  if (error) throw new Error("Dish unavailable");
  return data[0] ?? null;
}
