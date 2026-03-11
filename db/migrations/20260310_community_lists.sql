-- Community Lists domain tables

create table if not exists public.community_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  tags text[] not null default '{}'::text[],
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_lists_title_not_empty'
      AND conrelid = 'public.community_lists'::regclass
  ) THEN
    ALTER TABLE public.community_lists
      ADD CONSTRAINT community_lists_title_not_empty
      CHECK (length(btrim(title)) > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_lists_description_not_empty'
      AND conrelid = 'public.community_lists'::regclass
  ) THEN
    ALTER TABLE public.community_lists
      ADD CONSTRAINT community_lists_description_not_empty
      CHECK (description IS NULL OR length(btrim(description)) > 0);
  END IF;
END
$$;

create index if not exists community_lists_published_idx
  on public.community_lists (is_published, published_at desc);

create index if not exists community_lists_user_idx
  on public.community_lists (user_id, created_at desc);

create table if not exists public.community_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.community_lists (id) on delete cascade,
  album_id uuid not null references public.album (id) on delete cascade,
  position integer not null,
  created_at timestamptz not null default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_list_items_position_positive'
      AND conrelid = 'public.community_list_items'::regclass
  ) THEN
    ALTER TABLE public.community_list_items
      ADD CONSTRAINT community_list_items_position_positive
      CHECK (position > 0);
  END IF;
END
$$;

create unique index if not exists community_list_items_unique_position
  on public.community_list_items (list_id, position);

create unique index if not exists community_list_items_unique_album
  on public.community_list_items (list_id, album_id);

create index if not exists community_list_items_list_idx
  on public.community_list_items (list_id, position asc);

create table if not exists public.community_list_favorites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.community_lists (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists community_list_favorites_unique_user
  on public.community_list_favorites (list_id, user_id);

create index if not exists community_list_favorites_list_idx
  on public.community_list_favorites (list_id, created_at desc);

create table if not exists public.community_list_comments (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.community_lists (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  comment_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_list_comments_not_empty'
      AND conrelid = 'public.community_list_comments'::regclass
  ) THEN
    ALTER TABLE public.community_list_comments
      ADD CONSTRAINT community_list_comments_not_empty
      CHECK (length(btrim(comment_text)) > 0);
  END IF;
END
$$;

create index if not exists community_list_comments_list_idx
  on public.community_list_comments (list_id, created_at desc);

alter table public.community_lists enable row level security;
alter table public.community_list_items enable row level security;
alter table public.community_list_favorites enable row level security;
alter table public.community_list_comments enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_lists'
      AND policyname = 'community_lists_select_published'
  ) THEN
    CREATE POLICY community_lists_select_published
      ON public.community_lists
      FOR SELECT
      USING (is_published = true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_lists'
      AND policyname = 'community_lists_insert_own'
  ) THEN
    CREATE POLICY community_lists_insert_own
      ON public.community_lists
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
      AND tablename = 'community_lists'
      AND policyname = 'community_lists_update_own'
  ) THEN
    CREATE POLICY community_lists_update_own
      ON public.community_lists
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
      AND tablename = 'community_lists'
      AND policyname = 'community_lists_delete_own'
  ) THEN
    CREATE POLICY community_lists_delete_own
      ON public.community_lists
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
      AND tablename = 'community_list_items'
      AND policyname = 'community_list_items_select_published'
  ) THEN
    CREATE POLICY community_list_items_select_published
      ON public.community_list_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_items.list_id
            AND l.is_published = true
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
      AND tablename = 'community_list_items'
      AND policyname = 'community_list_items_insert_owner'
  ) THEN
    CREATE POLICY community_list_items_insert_owner
      ON public.community_list_items
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_items.list_id
            AND l.user_id = auth.uid()
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
      AND tablename = 'community_list_items'
      AND policyname = 'community_list_items_update_owner'
  ) THEN
    CREATE POLICY community_list_items_update_owner
      ON public.community_list_items
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_items.list_id
            AND l.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_items.list_id
            AND l.user_id = auth.uid()
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
      AND tablename = 'community_list_items'
      AND policyname = 'community_list_items_delete_owner'
  ) THEN
    CREATE POLICY community_list_items_delete_owner
      ON public.community_list_items
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_items.list_id
            AND l.user_id = auth.uid()
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
      AND tablename = 'community_list_favorites'
      AND policyname = 'community_list_favorites_select_published'
  ) THEN
    CREATE POLICY community_list_favorites_select_published
      ON public.community_list_favorites
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_favorites.list_id
            AND l.is_published = true
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
      AND tablename = 'community_list_favorites'
      AND policyname = 'community_list_favorites_insert_own'
  ) THEN
    CREATE POLICY community_list_favorites_insert_own
      ON public.community_list_favorites
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
      AND tablename = 'community_list_favorites'
      AND policyname = 'community_list_favorites_delete_own'
  ) THEN
    CREATE POLICY community_list_favorites_delete_own
      ON public.community_list_favorites
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
      AND tablename = 'community_list_comments'
      AND policyname = 'community_list_comments_select_published'
  ) THEN
    CREATE POLICY community_list_comments_select_published
      ON public.community_list_comments
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.community_lists l
          WHERE l.id = community_list_comments.list_id
            AND l.is_published = true
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
      AND tablename = 'community_list_comments'
      AND policyname = 'community_list_comments_insert_own'
  ) THEN
    CREATE POLICY community_list_comments_insert_own
      ON public.community_list_comments
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
      AND tablename = 'community_list_comments'
      AND policyname = 'community_list_comments_update_own'
  ) THEN
    CREATE POLICY community_list_comments_update_own
      ON public.community_list_comments
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
      AND tablename = 'community_list_comments'
      AND policyname = 'community_list_comments_delete_own'
  ) THEN
    CREATE POLICY community_list_comments_delete_own
      ON public.community_list_comments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
