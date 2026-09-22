begin;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  seed_key text not null unique check (length(seed_key) between 1 and 200),
  name text not null check (length(trim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  address text not null check (length(trim(address)) between 1 and 500),
  city text not null check (length(trim(city)) between 1 and 200),
  region text not null check (length(trim(region)) between 1 and 200),
  country text not null check (country ~ '^[A-Z]{2}$'),
  cuisine text check (length(cuisine) <= 200),
  price_level smallint check (price_level between 1 and 4),
  website_url text check (website_url ~ '^https?://[^[:space:]]+$'),
  menu_source_url text not null check (menu_source_url ~ '^https?://[^[:space:]]+$'),
  source_checked_at timestamptz not null check (isfinite(source_checked_at)),
  menu_coverage text not null check (menu_coverage in ('selected', 'full')),
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  seed_key text not null check (length(seed_key) between 1 and 200),
  name text not null check (length(trim(name)) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (length(trim(category)) between 1 and 80),
  description text check (length(description) <= 2000),
  price_cents integer check (price_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  image_path text,
  source_url text not null check (source_url ~ '^https?://[^[:space:]]+$'),
  source_checked_at timestamptz not null check (isfinite(source_checked_at)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, seed_key),
  unique (restaurant_id, slug)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references public.dishes(id) on delete restrict,
  -- Unconstrained numeric lets CHECK see the original precision instead of rounding 9.25.
  score numeric not null check (score between 1 and 10 and score * 10 = trunc(score * 10)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dish_id)
);
create index ratings_dish_id_idx on public.ratings(dish_id);
create index dishes_restaurant_active_category_idx on public.dishes(restaurant_id, is_active, category);
create index restaurants_active_name_idx on public.restaurants(is_active, name);

create function public.maintain_row_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Record identity is immutable' using errcode = '23514';
  end if;
  if tg_table_name = 'ratings' then
    if new.user_id is distinct from old.user_id or new.dish_id is distinct from old.dish_id then
      raise exception 'Rating identity is immutable' using errcode = '23514';
    end if;
  else
    if new.seed_key is distinct from old.seed_key or new.slug is distinct from old.slug then
      raise exception 'Catalog identity is immutable' using errcode = '23514';
    end if;
    if tg_table_name = 'dishes' and to_jsonb(new)->>'restaurant_id' is distinct from to_jsonb(old)->>'restaurant_id' then
      raise exception 'Dish restaurant is immutable' using errcode = '23514';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.maintain_row_identity() from public, anon, authenticated;
create trigger restaurants_updated before update on public.restaurants for each row execute function public.maintain_row_identity();
create trigger dishes_updated before update on public.dishes for each row execute function public.maintain_row_identity();
create trigger ratings_updated before update on public.ratings for each row execute function public.maintain_row_identity();

alter table public.restaurants enable row level security;
alter table public.dishes enable row level security;
alter table public.ratings enable row level security;
revoke all on public.restaurants, public.dishes, public.ratings from public, anon, authenticated;
grant select on public.restaurants, public.dishes to anon, authenticated;
grant select on public.ratings to authenticated;
grant insert (user_id, dish_id, score), update (score) on public.ratings to authenticated;
grant all on public.restaurants, public.dishes, public.ratings to service_role;

create policy catalog_read on public.restaurants for select to anon, authenticated using (true);
create policy catalog_read on public.dishes for select to anon, authenticated using (true);
create policy rating_read_own on public.ratings for select to authenticated using ((select auth.uid()) = user_id);
create policy rating_insert_own on public.ratings for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    where d.id = dish_id and d.is_active and r.is_active
  )
);
create policy rating_update_own on public.ratings for update to authenticated
using ((select auth.uid()) = user_id and exists (
  select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id where d.id = dish_id and d.is_active and r.is_active
))
with check ((select auth.uid()) = user_id and exists (
  select 1 from public.dishes d join public.restaurants r on r.id = d.restaurant_id where d.id = dish_id and d.is_active and r.is_active
));

-- Intentional RLS bypass: fixed, read-only aggregate projection; no individual account data.
create function public.restaurant_menu(p_restaurant_id uuid, p_limit integer default 50, p_offset integer default 0)
returns table (id uuid, restaurant_id uuid, name text, category text, description text, price_cents integer, currency text,
  source_url text, source_checked_at timestamptz, average_score numeric, rating_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_restaurant_id is null or p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 10000 then
    raise exception 'Invalid menu query' using errcode = '22023';
  end if;
  return query
    select d.id, d.restaurant_id, d.name, d.category, d.description, d.price_cents, d.currency, d.source_url, d.source_checked_at,
      avg(rt.score), count(rt.id)
    from public.dishes d join public.restaurants r on r.id = d.restaurant_id
    left join public.ratings rt on rt.dish_id = d.id
    where d.restaurant_id = p_restaurant_id and d.is_active and r.is_active
    group by d.id
    order by avg(rt.score) desc nulls last, count(rt.id) desc, d.name asc, d.id asc
    limit p_limit offset p_offset;
end;
$$;

-- Intentional RLS bypass: lookup of ONE saved score; never lists users or ratings.
create function public.public_rating(p_rating_id uuid)
returns table (id uuid, dish_id uuid, score numeric, updated_at timestamptz, dish_name text,
  restaurant_id uuid, restaurant_name text, restaurant_address text, dish_is_active boolean, restaurant_is_active boolean)
language sql stable security definer set search_path = '' as $$
  select rt.id, rt.dish_id, rt.score, rt.updated_at, d.name, r.id, r.name, r.address, d.is_active, r.is_active
  from public.ratings rt join public.dishes d on d.id = rt.dish_id join public.restaurants r on r.id = d.restaurant_id
  where rt.id = p_rating_id limit 1;
$$;
revoke all on function public.restaurant_menu(uuid, integer, integer), public.public_rating(uuid) from public, anon, authenticated;
grant execute on function public.restaurant_menu(uuid, integer, integer), public.public_rating(uuid) to anon, authenticated;

commit;
