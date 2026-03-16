-- Performance indexes + aggregation helpers for home/explore/list workloads

-- Backlog access patterns:
-- - user timeline/activity: where user_id = ? order by added_at/updated_at desc
-- - popularity aggregation: group by album_id with distinct user counts
-- - review discovery: where review_text is not null, order by reviewed_at desc
create index if not exists backlog_user_added_desc_idx
  on public.backlog (user_id, added_at desc);

create index if not exists backlog_user_updated_desc_idx
  on public.backlog (user_id, updated_at desc);

create index if not exists backlog_album_user_idx
  on public.backlog (album_id, user_id)
  where album_id is not null;

create index if not exists backlog_reviewed_desc_idx
  on public.backlog (reviewed_at desc, updated_at desc)
  where review_text is not null;

create index if not exists backlog_user_status_idx
  on public.backlog (user_id, status);

-- Review interaction activity windows:
-- - recent likes/comments ordered by created_at
create index if not exists review_likes_created_backlog_user_idx
  on public.review_likes (created_at desc, backlog_id, user_id);

create index if not exists review_comments_created_backlog_user_idx
  on public.review_comments (created_at desc, backlog_id, user_id);

-- Community list filters:
-- - tag filtering uses array containment
create index if not exists community_lists_tags_gin_idx
  on public.community_lists using gin (tags);

-- Aggregate popular albums directly in Postgres (instead of full-table app-side grouping).
create or replace function public.get_popular_albums_from_backlog(
  p_offset integer default 0,
  p_limit integer default 20
)
returns table (
  album_id uuid,
  album_title_raw text,
  artist_name_raw text,
  logs_count bigint,
  ratings_count bigint,
  average_rating numeric(8,4),
  last_logged_at timestamptz,
  last_backlog_updated_at timestamptz
)
language sql
stable
as $$
  with aggregated as (
    select
      b.album_id,
      max(nullif(btrim(b.album_title_raw), '')) as album_title_raw,
      max(nullif(btrim(b.artist_name_raw), '')) as artist_name_raw,
      count(distinct b.user_id)::bigint as logs_count,
      count(b.rating) filter (where b.rating is not null)::bigint as ratings_count,
      (avg(b.rating) filter (where b.rating is not null))::numeric(8,4) as average_rating,
      max(b.added_at) as last_logged_at,
      max(coalesce(b.updated_at, b.added_at)) as last_backlog_updated_at
    from public.backlog b
    where b.album_id is not null
    group by b.album_id
  )
  select
    a.album_id,
    a.album_title_raw,
    a.artist_name_raw,
    a.logs_count,
    a.ratings_count,
    a.average_rating,
    a.last_logged_at,
    a.last_backlog_updated_at
  from aggregated a
  order by
    a.logs_count desc,
    a.average_rating desc nulls last,
    a.last_backlog_updated_at desc nulls last
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Per-user home summary in one DB round-trip.
create or replace function public.get_user_backlog_home_summary(
  p_user_id uuid
)
returns table (
  listened_count bigint,
  backlog_count bigint,
  logs_count bigint,
  rated_count bigint,
  rating_distribution jsonb
)
language sql
stable
as $$
  with user_rows as (
    select status, rating
    from public.backlog
    where user_id = p_user_id
  ),
  status_totals as (
    select
      count(*)::bigint as listened_count,
      count(*) filter (
        where lower(coalesce(status, '')) in ('listening', 'unfinished', 'backloggd')
      )::bigint as backlog_count,
      count(*) filter (where lower(coalesce(status, '')) = 'listened')::bigint as logs_count,
      count(*) filter (where rating is not null and rating >= 1 and rating <= 5)::bigint as rated_count
    from user_rows
  ),
  buckets as (
    select generate_series(1.0, 5.0, 0.5)::numeric(2,1) as bucket
  ),
  distribution as (
    select
      b.bucket,
      coalesce(
        count(u.rating) filter (
          where round((u.rating::numeric) * 2) / 2 = b.bucket
        ),
        0
      )::bigint as count
    from buckets b
    left join user_rows u
      on u.rating is not null and u.rating >= 1 and u.rating <= 5
    group by b.bucket
    order by b.bucket
  )
  select
    s.listened_count,
    s.backlog_count,
    s.logs_count,
    s.rated_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'bucket', d.bucket::text,
            'count', d.count
          )
          order by d.bucket
        )
        from distribution d
      ),
      '[]'::jsonb
    ) as rating_distribution
  from status_totals s;
$$;

grant execute on function public.get_popular_albums_from_backlog(integer, integer)
  to anon, authenticated, service_role;

grant execute on function public.get_user_backlog_home_summary(uuid)
  to anon, authenticated, service_role;
