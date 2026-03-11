-- Ensure new community list tables are visible to PostgREST roles

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.community_lists to anon, authenticated, service_role;
grant select on table public.community_list_items to anon, authenticated, service_role;
grant select on table public.community_list_favorites to anon, authenticated, service_role;
grant select on table public.community_list_comments to anon, authenticated, service_role;

grant insert, update, delete on table public.community_lists to authenticated, service_role;
grant insert, update, delete on table public.community_list_items to authenticated, service_role;
grant insert, update, delete on table public.community_list_favorites to authenticated, service_role;
grant insert, update, delete on table public.community_list_comments to authenticated, service_role;

notify pgrst, 'reload schema';
