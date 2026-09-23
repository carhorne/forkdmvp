import "server-only";
import { createClient } from "@/lib/supabase/server";
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

// Active dishes with aggregates in Top Rated order; one bounded RPC, no per-dish requests.
export async function getMenu(restaurantId: string) {
  const client = await createClient();
  const { data, error } = await client.rpc("restaurant_menu", { p_restaurant_id: restaurantId, p_limit: 50, p_offset: 0 });
  if (error) throw new Error("Menu unavailable");
  return data;
}

// Public dish by stable ID, including retired dishes so old links keep working. Null means 404.
export async function getDish(id: string) {
  if (!isUuid(id)) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("dish_detail", { p_dish_id: id });
  if (error) throw new Error("Dish unavailable");
  return data[0] ?? null;
}
