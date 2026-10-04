-- ============================================================
-- Migration: Albums, Album Photos, and Favorites
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/ufquqlehjzmzmizyubgi/sql
-- ============================================================

-- 1. Albums table
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  cover_photo_id uuid references public.images(id) on delete set null,
  cover_photo_url text,
  privacy text not null default 'private',
  created_at timestamptz not null default now(),


  
  updated_at timestamptz not null default now()
);

create index if not exists albums_user_id_idx on public.albums(user_id);
create index if not exists albums_created_at_idx on public.albums(created_at desc);

alter table public.albums enable row level security;

create policy "Users can view own albums"
  on public.albums for select
  using (auth.uid() = user_id);

create policy "Users can insert own albums"
  on public.albums for insert
  with check (auth.uid() = user_id);

create policy "Users can update own albums"
  on public.albums for update
  using (auth.uid() = user_id);

create policy "Users can delete own albums"
  on public.albums for delete
  using (auth.uid() = user_id);

-- 2. Album Photos junction table
create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  photo_id uuid not null references public.images(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (album_id, photo_id)
);

create index if not exists album_photos_album_id_idx on public.album_photos(album_id);
create index if not exists album_photos_photo_id_idx on public.album_photos(photo_id);
create index if not exists album_photos_user_id_idx on public.album_photos(user_id);

alter table public.album_photos enable row level security;

create policy "Users can view own album_photos"
  on public.album_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert own album_photos"
  on public.album_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own album_photos"
  on public.album_photos for delete
  using (auth.uid() = user_id);

-- 3. Favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid not null references public.images(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, photo_id)
);

create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists favorites_photo_id_idx on public.favorites(photo_id);

alter table public.favorites enable row level security;

create policy "Users can view own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);
