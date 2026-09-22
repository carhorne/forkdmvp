import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCatalog() {
  const client = await createClient();
  const { data: restaurants, error } = await client.from("restaurants")
    .select("id,name,address,city,region,cuisine,menu_coverage,menu_source_url,source_checked_at")
    .eq("is_active", true).order("name").order("id").limit(20);
  if (error) throw new Error("Catalog unavailable");
  if (!restaurants.length) return [];
  // One bounded menu query for the entire catalog, not one request per restaurant/dish.
  const { data: dishes, error: dishError } = await client.from("dishes")
    .select("id,restaurant_id,name,price_cents,currency")
    .in("restaurant_id", restaurants.map((r) => r.id)).eq("is_active", true).order("name").order("id").limit(600);
  if (dishError) throw new Error("Menus unavailable");
  return restaurants.map((r) => ({ ...r, sample: dishes.filter((d) => d.restaurant_id === r.id).slice(0, 3) }));
}
