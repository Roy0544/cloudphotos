-- ============================================================
-- Schema for AI-Enhanced Cloud Photo Storage
-- Run this in the Supabase SQL editor, or via `supabase db push`
-- ============================================================

-- Images table: metadata only. Actual bytes live in Cloudflare R2.
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- R2 object key, e.g. "userId/uuid.webp" — this is what you use to
  -- build signed URLs or ImageKit external-origin transform URLs.
  r2_key text not null unique,

  -- Original filename as uploaded by the user, for display purposes only.
  original_filename text,

  mime_type text not null default 'image/webp',
  original_size_bytes bigint not null,
  compressed_size_bytes bigint not null,

  -- Optional: dimensions, useful for rendering layout without fetching the file.
  width int,
  height int,

  -- Self-reference: if this row is an AI-edited version of another image,
  -- point to the original. Null means this is an original upload.
  parent_image_id uuid references public.images(id) on delete cascade,

  -- What kind of AI transform produced this row, if any (e.g. 'bg-remove', 'bg-redesign').
  ai_transform_type text,

  created_at timestamptz not null default now()
);

create index if not exists images_user_id_idx on public.images(user_id);
create index if not exists images_parent_image_id_idx on public.images(parent_image_id);
create index if not exists images_created_at_idx on public.images(created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.images enable row level security;

-- Users can only see their own images.
create policy "Users can view own images"
  on public.images for select
  using (auth.uid() = user_id);

-- Users can only insert images with their own user_id.
create policy "Users can insert own images"
  on public.images for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own images.
create policy "Users can delete own images"
  on public.images for delete
  using (auth.uid() = user_id);

-- Users can only update their own images (e.g. renaming).
create policy "Users can update own images"
  on public.images for update
  using (auth.uid() = user_id);

-- ============================================================
-- Optional: simple view for per-user storage usage
-- ============================================================
create or replace view public.user_storage_usage as
select
  user_id,
  count(*) as image_count,
  sum(compressed_size_bytes) as total_bytes_used
from public.images
group by user_id;

-- Note: RLS on views inherits from the underlying table in Postgres 15+ on
-- Supabase; verify this behaves as expected for your Postgres version, or
-- wrap it in a security-definer function scoped to auth.uid() if not.

-- ============================================================
-- Videos table (Phase 2)
-- Video bytes live in Cloudflare Stream, not R2 — this table stores only
-- the Stream video ID and app-level metadata, same pattern as `images`.
-- ============================================================
create type video_status as enum ('pending', 'processing', 'ready', 'error');

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Cloudflare Stream's video UID, returned when the TUS/Direct Creator
  -- upload is created. This is what you use to build signed playback URLs.
  stream_video_id text not null unique,

  original_filename text,
  duration_seconds numeric,
  status video_status not null default 'pending',

  -- Set by the webhook handler when Stream finishes encoding (or fails).
  -- Null while status = 'pending'/'processing'.
  ready_at timestamptz,
  error_message text,

  -- Set true if this upload came from the Android auto-upload path, useful
  -- for debugging/dedupe auditing separate from manual web uploads.
  uploaded_via_auto_sync boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists videos_user_id_idx on public.videos(user_id);
create index if not exists videos_status_idx on public.videos(status);
create index if not exists videos_created_at_idx on public.videos(created_at desc);

alter table public.videos enable row level security;

create policy "Users can view own videos"
  on public.videos for select
  using (auth.uid() = user_id);

create policy "Users can insert own videos"
  on public.videos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own videos"
  on public.videos for delete
  using (auth.uid() = user_id);

create policy "Users can update own videos"
  on public.videos for update
  using (auth.uid() = user_id);

-- Note: the Stream webhook handler runs server-side with the Supabase
-- service role key (bypasses RLS), since Cloudflare's webhook call has no
-- Supabase user session attached to it. It must independently verify the
-- webhook signature before writing to this table — see AGENTS.md.
