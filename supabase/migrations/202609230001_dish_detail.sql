begin;

-- Intentional RLS bypass: ONE dish with its aggregate; no individual account data.
-- Unlike restaurant_menu it also returns retired dishes/restaurants so old links stay readable.
create function public.dish_detail(p_dish_id uuid)
returns table (id uuid, restaurant_id uuid, name text, category text, description text, price_cents integer, currency text,
  source_url text, source_checked_at timestamptz, is_active boolean, restaurant_name text, restaurant_address text,
  restaurant_city text, restaurant_region text, restaurant_is_active boolean, average_score numeric, rating_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_dish_id is null then
    raise exception 'Invalid dish query' using errcode = '22023';
  end if;
  return query
    select d.id, d.restaurant_id, d.name, d.category, d.description, d.price_cents, d.currency, d.source_url, d.source_checked_at,
      d.is_active, r.name, r.address, r.city, r.region, r.is_active, avg(rt.score), count(rt.id)
    from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    left join public.ratings rt on rt.dish_id = d.id
    where d.id = p_dish_id
    group by d.id, r.id
    limit 1;
end;
$$;
revoke all on function public.dish_detail(uuid) from public, anon, authenticated;
grant execute on function public.dish_detail(uuid) to anon, authenticated;

commit;
