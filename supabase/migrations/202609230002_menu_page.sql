begin;

-- Intentional RLS bypass: filtered, sorted, paged aggregate projection of ONE restaurant's active menu;
-- no individual account data. Sort keys are allowlisted and every ORDER BY expression is fixed (no dynamic SQL).
-- Sorting happens over the complete filtered set before LIMIT/OFFSET; total_count is that set's size.
create function public.menu_page(p_restaurant_id uuid, p_query text default null, p_category text default null,
  p_sort text default 'top', p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, restaurant_id uuid, name text, category text, description text, price_cents integer, currency text,
  average_score numeric, rating_count bigint, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_pattern text;
begin
  if p_restaurant_id is null or p_sort is null or p_sort not in ('top', 'most', 'price')
    or p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 10000
    or length(v_query) > 100 or length(p_category) > 80 then
    raise exception 'Invalid menu query' using errcode = '22023';
  end if;
  -- Search text is literal: escape the ILIKE escape character and wildcards.
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
    with matching as (
      select d.id, d.restaurant_id, d.name, d.category, d.description, d.price_cents, d.currency,
        avg(rt.score) as average_score, count(rt.id) as rating_count
      from public.dishes d join public.restaurants r on r.id = d.restaurant_id
      left join public.ratings rt on rt.dish_id = d.id
      where d.restaurant_id = p_restaurant_id and d.is_active and r.is_active
        and (p_category is null or d.category = p_category)
        and (v_query is null or d.name ilike v_pattern or d.description ilike v_pattern)
      group by d.id
    )
    select m.id, m.restaurant_id, m.name, m.category, m.description, m.price_cents, m.currency,
      m.average_score, m.rating_count, count(*) over ()
    from matching m
    order by
      -- Most Rated: count desc, then average desc (unrated last).
      case when p_sort = 'most' then m.rating_count end desc nulls last,
      -- Top Rated: average desc (unrated last), then count desc. Also Most Rated's second key.
      case when p_sort in ('top', 'most') then m.average_score end desc nulls last,
      case when p_sort = 'top' then m.rating_count end desc nulls last,
      -- Price Low → High: unknown prices last.
      case when p_sort = 'price' then m.price_cents end asc nulls last,
      m.name asc, m.id asc
    limit p_limit offset p_offset;
end;
$$;
revoke all on function public.menu_page(uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.menu_page(uuid, text, text, text, integer, integer) to anon, authenticated;

commit;
