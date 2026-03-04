-- Add review support to backlog
alter table public.backlog
  add column if not exists review_text text,
  add column if not exists reviewed_at timestamptz;

-- review_text may be null, but cannot be empty or whitespace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'review_not_empty'
      AND conrelid = 'public.backlog'::regclass
  ) THEN
    ALTER TABLE public.backlog
      ADD CONSTRAINT review_not_empty
      CHECK (review_text IS NULL OR length(btrim(review_text)) > 0);
  END IF;
END
$$;

-- review lookup indexes
create index if not exists backlog_user_reviews_idx
  on public.backlog (user_id)
  where review_text is not null;

create index if not exists backlog_album_reviews_idx
  on public.backlog (album_id)
  where review_text is not null;

-- RLS for review writes and reads
alter table public.backlog enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'backlog'
      AND policyname = 'backlog_insert_own'
  ) THEN
    CREATE POLICY backlog_insert_own
      ON public.backlog
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
      AND tablename = 'backlog'
      AND policyname = 'backlog_update_own'
  ) THEN
    CREATE POLICY backlog_update_own
      ON public.backlog
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
      AND tablename = 'backlog'
      AND policyname = 'backlog_select_reviews_public'
  ) THEN
    CREATE POLICY backlog_select_reviews_public
      ON public.backlog
      FOR SELECT
      USING (review_text IS NOT NULL);
  END IF;
END
$$;
