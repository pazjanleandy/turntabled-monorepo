-- Ensure notifications table and helper functions are visible to PostgREST roles

grant usage on schema public to anon, authenticated, service_role;

grant select, update on table public.notifications to authenticated, service_role;
grant insert, delete on table public.notifications to service_role;

revoke all on function public.create_social_notification(uuid, uuid, text, text, uuid, uuid, text, text, jsonb) from public;
revoke all on function public.create_social_notification(uuid, uuid, text, text, uuid, uuid, text, text, jsonb) from anon, authenticated;

grant execute on function public.notifications_set_updated_at() to service_role;
grant execute on function public.create_social_notification(uuid, uuid, text, text, uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.notify_review_like_insert() to service_role;
grant execute on function public.notify_review_like_delete() to service_role;
grant execute on function public.notify_review_comment_insert() to service_role;
grant execute on function public.notify_list_like_insert() to service_role;
grant execute on function public.notify_list_like_delete() to service_role;
grant execute on function public.notify_list_comment_insert() to service_role;
grant execute on function public.notify_user_follow_insert() to service_role;
grant execute on function public.notify_user_follow_delete() to service_role;

notify pgrst, 'reload schema';
