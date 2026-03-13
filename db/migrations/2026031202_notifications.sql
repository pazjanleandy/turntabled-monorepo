-- In-app notifications for social interactions

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  actor_id uuid references public.users (id) on delete set null,
  type text not null,
  entity_type text not null,
  entity_id uuid,
  comment_id uuid,
  dedupe_key text not null,
  actor_username text,
  actor_avatar_url text,
  entity_title text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_type_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (
        type IN (
          'review_liked',
          'review_commented',
          'list_liked',
          'list_commented',
          'user_followed'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_entity_type_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_entity_type_check
      CHECK (entity_type IN ('review', 'list', 'user'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_actor_recipient_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_actor_recipient_check
      CHECK (actor_id IS NULL OR actor_id <> user_id);
  END IF;
END
$$;

create unique index if not exists notifications_dedupe_key_unique_idx
  on public.notifications (dedupe_key);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

create index if not exists notifications_actor_created_idx
  on public.notifications (actor_id, created_at desc);

alter table public.notifications enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_select_own'
  ) THEN
    CREATE POLICY notifications_select_own
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_update_own'
  ) THEN
    CREATE POLICY notifications_update_own
      ON public.notifications
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

create or replace function public.notifications_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists notifications_set_updated_at on public.notifications;

create trigger notifications_set_updated_at
before update on public.notifications
for each row
execute function public.notifications_set_updated_at();

create or replace function public.create_social_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_comment_id uuid,
  p_entity_title text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_username text;
  v_actor_avatar_url text;
begin
  if p_recipient_id is null or p_actor_id is null then
    return;
  end if;

  if p_recipient_id = p_actor_id then
    return;
  end if;

  if p_dedupe_key is null or btrim(p_dedupe_key) = '' then
    return;
  end if;

  select u.username, u.avatar_url
  into v_actor_username, v_actor_avatar_url
  from public.users u
  where u.id = p_actor_id;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    comment_id,
    dedupe_key,
    actor_username,
    actor_avatar_url,
    entity_title,
    metadata,
    is_read
  )
  values (
    p_recipient_id,
    p_actor_id,
    p_type,
    p_entity_type,
    p_entity_id,
    p_comment_id,
    p_dedupe_key,
    v_actor_username,
    v_actor_avatar_url,
    p_entity_title,
    coalesce(p_metadata, '{}'::jsonb),
    false
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.notify_review_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_album_id uuid;
  v_album_title text;
begin
  select
    b.user_id,
    b.album_id,
    coalesce(a.title, b.album_title_raw, 'Unknown album')
  into v_recipient_id, v_album_id, v_album_title
  from public.backlog b
  left join public.album a on a.id = b.album_id
  where b.id = NEW.backlog_id;

  perform public.create_social_notification(
    v_recipient_id,
    NEW.user_id,
    'review_liked',
    'review',
    NEW.backlog_id,
    null,
    v_album_title,
    format('review_liked:%s:%s', NEW.backlog_id, NEW.user_id),
    jsonb_strip_nulls(
      jsonb_build_object(
        'backlogId', NEW.backlog_id,
        'albumId', v_album_id,
        'albumTitle', v_album_title
      )
    )
  );

  return NEW;
end;
$$;

create or replace function public.notify_review_like_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where dedupe_key = format('review_liked:%s:%s', OLD.backlog_id, OLD.user_id)
    and type = 'review_liked';

  return OLD;
end;
$$;

create or replace function public.notify_review_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_album_id uuid;
  v_album_title text;
begin
  select
    b.user_id,
    b.album_id,
    coalesce(a.title, b.album_title_raw, 'Unknown album')
  into v_recipient_id, v_album_id, v_album_title
  from public.backlog b
  left join public.album a on a.id = b.album_id
  where b.id = NEW.backlog_id;

  perform public.create_social_notification(
    v_recipient_id,
    NEW.user_id,
    'review_commented',
    'review',
    NEW.backlog_id,
    NEW.id,
    v_album_title,
    format('review_commented:%s', NEW.id),
    jsonb_strip_nulls(
      jsonb_build_object(
        'backlogId', NEW.backlog_id,
        'commentId', NEW.id,
        'albumId', v_album_id,
        'albumTitle', v_album_title
      )
    )
  );

  return NEW;
end;
$$;

create or replace function public.notify_list_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_list_title text;
begin
  select l.user_id, coalesce(nullif(btrim(l.title), ''), 'Untitled list')
  into v_recipient_id, v_list_title
  from public.community_lists l
  where l.id = NEW.list_id;

  perform public.create_social_notification(
    v_recipient_id,
    NEW.user_id,
    'list_liked',
    'list',
    NEW.list_id,
    null,
    v_list_title,
    format('list_liked:%s:%s', NEW.list_id, NEW.user_id),
    jsonb_strip_nulls(
      jsonb_build_object(
        'listId', NEW.list_id,
        'listTitle', v_list_title
      )
    )
  );

  return NEW;
end;
$$;

create or replace function public.notify_list_like_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where dedupe_key = format('list_liked:%s:%s', OLD.list_id, OLD.user_id)
    and type = 'list_liked';

  return OLD;
end;
$$;

create or replace function public.notify_list_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_list_title text;
begin
  select l.user_id, coalesce(nullif(btrim(l.title), ''), 'Untitled list')
  into v_recipient_id, v_list_title
  from public.community_lists l
  where l.id = NEW.list_id;

  perform public.create_social_notification(
    v_recipient_id,
    NEW.user_id,
    'list_commented',
    'list',
    NEW.list_id,
    NEW.id,
    v_list_title,
    format('list_commented:%s', NEW.id),
    jsonb_strip_nulls(
      jsonb_build_object(
        'listId', NEW.list_id,
        'commentId', NEW.id,
        'listTitle', v_list_title
      )
    )
  );

  return NEW;
end;
$$;

create or replace function public.notify_user_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_social_notification(
    NEW.friend_id,
    NEW.user_id,
    'user_followed',
    'user',
    NEW.user_id,
    null,
    null,
    format('user_followed:%s:%s', NEW.friend_id, NEW.user_id),
    jsonb_strip_nulls(
      jsonb_build_object(
        'followerId', NEW.user_id
      )
    )
  );

  return NEW;
end;
$$;

create or replace function public.notify_user_follow_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where dedupe_key = format('user_followed:%s:%s', OLD.friend_id, OLD.user_id)
    and type = 'user_followed';

  return OLD;
end;
$$;

drop trigger if exists notifications_review_like_insert on public.review_likes;
create trigger notifications_review_like_insert
after insert on public.review_likes
for each row
execute function public.notify_review_like_insert();

drop trigger if exists notifications_review_like_delete on public.review_likes;
create trigger notifications_review_like_delete
after delete on public.review_likes
for each row
execute function public.notify_review_like_delete();

drop trigger if exists notifications_review_comment_insert on public.review_comments;
create trigger notifications_review_comment_insert
after insert on public.review_comments
for each row
execute function public.notify_review_comment_insert();

drop trigger if exists notifications_list_like_insert on public.community_list_favorites;
create trigger notifications_list_like_insert
after insert on public.community_list_favorites
for each row
execute function public.notify_list_like_insert();

drop trigger if exists notifications_list_like_delete on public.community_list_favorites;
create trigger notifications_list_like_delete
after delete on public.community_list_favorites
for each row
execute function public.notify_list_like_delete();

drop trigger if exists notifications_list_comment_insert on public.community_list_comments;
create trigger notifications_list_comment_insert
after insert on public.community_list_comments
for each row
execute function public.notify_list_comment_insert();

drop trigger if exists notifications_user_follow_insert on public.friends;
create trigger notifications_user_follow_insert
after insert on public.friends
for each row
execute function public.notify_user_follow_insert();

drop trigger if exists notifications_user_follow_delete on public.friends;
create trigger notifications_user_follow_delete
after delete on public.friends
for each row
execute function public.notify_user_follow_delete();
