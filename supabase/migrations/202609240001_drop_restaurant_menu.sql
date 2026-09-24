begin;

-- Replaced by public.menu_page (Slice 3); unused by the app since then. Removing it leaves one fewer
-- SECURITY DEFINER function that reads ratings past RLS. Its original definition is in 202609220001.
drop function if exists public.restaurant_menu(uuid, integer, integer);

commit;
