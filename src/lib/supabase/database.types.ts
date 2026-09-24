// Hand-maintained, schema-aligned types. `supabase gen types` marks every RPC result column non-null,
// which would hide null averages/prices, so update this file with each migration instead.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Restaurant = {
  id: string; seed_key: string; name: string; slug: string; address: string; city: string; region: string;
  country: string; cuisine: string | null; price_level: number | null; website_url: string | null;
  menu_source_url: string; source_checked_at: string; menu_coverage: "selected" | "full";
  image_path: string | null; is_active: boolean; created_at: string; updated_at: string;
};
export type Dish = {
  id: string; restaurant_id: string; seed_key: string; name: string; slug: string; category: string;
  description: string | null; price_cents: number | null; currency: string; image_path: string | null;
  source_url: string; source_checked_at: string; is_active: boolean; created_at: string; updated_at: string;
};
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = {
  public: {
    Tables: { restaurants: Table<Restaurant>; dishes: Table<Dish>; ratings: Table<{
      id: string; user_id: string; dish_id: string; score: number; created_at: string; updated_at: string;
    }> };
    Views: { [_ in never]: never };
    Functions: {
      restaurant_menu: { Args: { p_restaurant_id: string; p_limit?: number; p_offset?: number }; Returns: {
        id: string; restaurant_id: string; name: string; category: string; description: string | null;
        price_cents: number | null; currency: string; source_url: string; source_checked_at: string;
        average_score: number | null; rating_count: number;
      }[] };
      public_rating: { Args: { p_rating_id: string }; Returns: {
        id: string; dish_id: string; score: number; updated_at: string; dish_name: string;
        restaurant_id: string; restaurant_name: string; restaurant_address: string;
        dish_is_active: boolean; restaurant_is_active: boolean;
      }[] };
      menu_page: { Args: { p_restaurant_id: string; p_query?: string | null; p_category?: string | null; p_sort?: "top" | "most" | "price"; p_limit?: number; p_offset?: number }; Returns: {
        id: string; restaurant_id: string; name: string; category: string; description: string | null;
        price_cents: number | null; currency: string; average_score: number | null; rating_count: number; total_count: number;
      }[] };
      // p_score is sent as validated text ("9.2") so PostgREST casts it to numeric without float rounding.
      save_rating: { Args: { p_dish_id: string; p_score: string }; Returns: { id: string; dish_id: string; score: number; updated_at: string }[] };
      dish_detail: { Args: { p_dish_id: string }; Returns: {
        id: string; restaurant_id: string; name: string; category: string; description: string | null;
        price_cents: number | null; currency: string; source_url: string; source_checked_at: string; is_active: boolean;
        restaurant_name: string; restaurant_address: string; restaurant_city: string; restaurant_region: string;
        restaurant_is_active: boolean; average_score: number | null; rating_count: number;
      }[] };
      import_restaurant: { Args: { p_data: Json; p_dry_run: boolean }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
