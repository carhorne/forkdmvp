begin;
-- Service-role-only, atomic per location. No arbitrary SQL or rating writes.
create function public.import_restaurant(p_data jsonb, p_dry_run boolean default true)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_r public.restaurants; v_d public.dishes; v_in public.restaurants; v_din public.dishes;
  v_menu jsonb; v_item jsonb; v_id uuid; v_currency text;
  v_create integer := 0; v_update integer := 0; v_retire integer := 0; v_unchanged integer := 0;
begin
  if p_dry_run is null or jsonb_typeof(p_data) <> 'object' or jsonb_typeof(p_data->'menu') <> 'array'
    or jsonb_array_length(p_data->'menu') not between 1 and 100 then
    raise exception 'Invalid restaurant payload' using errcode = '22023';
  end if;
  v_menu := p_data->'menu';
  if exists (select 1 from jsonb_object_keys(p_data) k where k not in ('seed_key','name','slug','address','city','region','country','cuisine','price_level','website_url','menu_source_url','source_checked_at','menu_coverage','image_path','is_active','menu')) then
    raise exception 'Unexpected restaurant field' using errcode = '22023';
  end if;
  if (select count(distinct x->>'seed_key') from jsonb_array_elements(v_menu) x) <> jsonb_array_length(v_menu)
    or (select count(distinct x->>'slug') from jsonb_array_elements(v_menu) x) <> jsonb_array_length(v_menu) then
    raise exception 'Duplicate dish identity' using errcode = '22023';
  end if;
  -- Serialize imports for the same location, including first creation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_data->>'seed_key', 0));
  select * into v_in from jsonb_populate_record(null::public.restaurants, p_data - 'menu');
  select * into v_r from public.restaurants where seed_key = v_in.seed_key;
  if v_r.id is not null and v_r.slug <> v_in.slug then raise exception 'Restaurant slug is immutable'; end if;
  v_id := coalesce(v_r.id, gen_random_uuid());
  if v_r.id is null then v_create := v_create + 1;
  elsif (to_jsonb(v_r) - array['id','created_at','updated_at']) = (to_jsonb(v_in) - array['id','created_at','updated_at']) then v_unchanged := v_unchanged + 1;
  elsif v_r.is_active and not v_in.is_active then v_retire := v_retire + 1;
  else v_update := v_update + 1; end if;

  if not p_dry_run then
    insert into public.restaurants (id,seed_key,name,slug,address,city,region,country,cuisine,price_level,website_url,menu_source_url,source_checked_at,menu_coverage,image_path,is_active)
    values (v_id,v_in.seed_key,v_in.name,v_in.slug,v_in.address,v_in.city,v_in.region,v_in.country,v_in.cuisine,v_in.price_level,v_in.website_url,v_in.menu_source_url,v_in.source_checked_at,v_in.menu_coverage,v_in.image_path,v_in.is_active)
    on conflict(seed_key) do update set name=excluded.name,address=excluded.address,city=excluded.city,region=excluded.region,country=excluded.country,cuisine=excluded.cuisine,price_level=excluded.price_level,website_url=excluded.website_url,menu_source_url=excluded.menu_source_url,source_checked_at=excluded.source_checked_at,menu_coverage=excluded.menu_coverage,image_path=excluded.image_path,is_active=excluded.is_active
    where (to_jsonb(restaurants) - array['id','created_at','updated_at']) is distinct from (to_jsonb(excluded) - array['id','created_at','updated_at']);
  end if;
  for v_item in select value from jsonb_array_elements(v_menu) loop
    if exists (select 1 from jsonb_object_keys(v_item) k where k not in ('seed_key','name','slug','category','description','price_cents','currency','image_path','source_url','source_checked_at','is_active')) then raise exception 'Unexpected dish field'; end if;
    select * into v_din from jsonb_populate_record(null::public.dishes, v_item);
    if v_currency is not null and v_currency <> v_din.currency then raise exception 'Mixed currencies'; end if;
    v_currency := v_din.currency;
    select * into v_d from public.dishes where restaurant_id = v_id and seed_key = v_din.seed_key;
    if v_d.id is not null and v_d.slug <> v_din.slug then raise exception 'Dish slug is immutable'; end if;
    if v_d.id is null then v_create := v_create + 1;
    elsif (to_jsonb(v_d) - array['id','restaurant_id','created_at','updated_at']) = (to_jsonb(v_din) - array['id','restaurant_id','created_at','updated_at']) then v_unchanged := v_unchanged + 1;
    elsif v_d.is_active and not v_din.is_active then v_retire := v_retire + 1;
    else v_update := v_update + 1; end if;
    if not p_dry_run then
      insert into public.dishes (restaurant_id,seed_key,name,slug,category,description,price_cents,currency,image_path,source_url,source_checked_at,is_active)
      values (v_id,v_din.seed_key,v_din.name,v_din.slug,v_din.category,v_din.description,v_din.price_cents,v_din.currency,v_din.image_path,v_din.source_url,v_din.source_checked_at,v_din.is_active)
      on conflict(restaurant_id,seed_key) do update set name=excluded.name,category=excluded.category,description=excluded.description,price_cents=excluded.price_cents,currency=excluded.currency,image_path=excluded.image_path,source_url=excluded.source_url,source_checked_at=excluded.source_checked_at,is_active=excluded.is_active
      where (to_jsonb(dishes) - array['id','created_at','updated_at']) is distinct from (to_jsonb(excluded) - array['id','created_at','updated_at']);
    end if;
  end loop;
  -- Omitted dishes remain intact. Currency checks include those preserved dishes.
  if exists (select 1 from public.dishes where restaurant_id = v_id and currency <> v_currency) then raise exception 'Preserved menu has another currency'; end if;
  return jsonb_build_object('create',v_create,'update',v_update,'retire',v_retire,'unchanged',v_unchanged,'dry_run',p_dry_run);
end;
$$;
revoke all on function public.import_restaurant(jsonb, boolean) from public, anon, authenticated;
grant execute on function public.import_restaurant(jsonb, boolean) to service_role;
commit;
