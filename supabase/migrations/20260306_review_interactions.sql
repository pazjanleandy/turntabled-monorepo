-- Add likes and comments for backlog-backed reviews

create table if not exists public.review_likes (
  id uuid primary key default gen_random_uuid(),
  backlog_id uuid not null references public.backlog (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  backlog_id uuid not null references public.backlog (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  comment_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists review_likes_backlog_user_unique_idx
  on public.review_likes (backlog_id, user_id);

create index if not exists review_likes_backlog_idx
  on public.review_likes (backlog_id, created_at desc);

create index if not exists review_comments_backlog_idx
  on public.review_comments (backlog_id, created_at desc);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'review_comments_not_empty'
      AND conrelid = 'public.review_comments'::regclass
  ) THEN
    ALTER TABLE public.review_comments
      ADD CONSTRAINT review_comments_not_empty
      CHECK (length(btrim(comment_text)) > 0);
  END IF;
END
$$;

alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_likes'
      AND policyname = 'review_likes_select_public'
  ) THEN
    CREATE POLICY review_likes_select_public
      ON public.review_likes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.backlog b
          WHERE b.id = review_likes.backlog_id
            AND b.review_text IS NOT NULL
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_likes'
      AND policyname = 'review_likes_insert_own'
  ) THEN
    CREATE POLICY review_likes_insert_own
      ON public.review_likes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_likes'
      AND policyname = 'review_likes_delete_own'
  ) THEN
    CREATE POLICY review_likes_delete_own
      ON public.review_likes
      FOR DELETE
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
      AND tablename = 'review_comments'
      AND policyname = 'review_comments_select_public'
  ) THEN
    CREATE POLICY review_comments_select_public
      ON public.review_comments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.backlog b
          WHERE b.id = review_comments.backlog_id
            AND b.review_text IS NOT NULL
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_comments'
      AND policyname = 'review_comments_insert_own'
  ) THEN
    CREATE POLICY review_comments_insert_own
      ON public.review_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_comments'
      AND policyname = 'review_comments_update_own'
  ) THEN
    CREATE POLICY review_comments_update_own
      ON public.review_comments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'review_comments'
      AND policyname = 'review_comments_delete_own'
  ) THEN
    CREATE POLICY review_comments_delete_own
      ON public.review_comments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
