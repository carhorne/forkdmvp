begin;

-- Create or update the caller's one rating for a dish, atomically. SECURITY INVOKER: every existing
-- ratings grant, RLS policy (ownership, active dish and restaurant), score CHECK and identity trigger
-- still applies. The user ID always comes from the verified session, never from the caller.
-- ON CONFLICT on the (user_id, dish_id) unique key makes repeated or concurrent submissions converge on
-- one row whose ID never changes; only score (and the trigger-maintained updated_at) is updated.
create function public.save_rating(p_dish_id uuid, p_score numeric)
returns table (id uuid, dish_id uuid, score numeric, updated_at timestamptz)
language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Sign in to rate' using errcode = '42501';
  end if;
  if p_dish_id is null or p_score is null then
    raise exception 'Invalid rating' using errcode = '22023';
  end if;
  return query
    insert into public.ratings as r (user_id, dish_id, score)
    values (v_user, p_dish_id, p_score)
    on conflict on constraint ratings_user_id_dish_id_key do update set score = excluded.score
    returning r.id, r.dish_id, r.score, r.updated_at;
end;
$$;
revoke all on function public.save_rating(uuid, numeric) from public, anon, authenticated;
grant execute on function public.save_rating(uuid, numeric) to authenticated;

commit;
