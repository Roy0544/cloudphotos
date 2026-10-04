# AGENTS.md

Instructions for any coding agent (Claude Code, Cursor, etc.) working in this repository.
Read this before making changes. See PRD.md, MVP.md, and ARCHITECTURE.md for product
and system context.

## Project Summary
A Next.js app where users upload photos to Cloudflare R2 (compressed server-side with
Sharp), with metadata tracked in Supabase, and optional AI edits (background removal,
background redesign) applied through ImageKit configured against R2 as an external
origin — never through ImageKit's own storage. Video (Phase 2) is a separate pipeline
entirely: it goes to Cloudflare Stream, not R2, and is never touched by Sharp. An
Android app (Phase 2, via Capacitor) wraps the same frontend and adds background
gallery auto-upload.

## Tech Stack
- **Framework**: Next.js 14+, App Router, TypeScript
- **Hosting**: Vercel
- **Photo storage**: Cloudflare R2, accessed via `@aws-sdk/client-s3` (S3-compatible API)
- **Photo compression**: `sharp` npm package — Node.js runtime only, never Edge runtime,
  and never applied to video (Sharp cannot process video at all)
- **Video storage/encoding/delivery**: Cloudflare Stream — uploaded via TUS
  (resumable), encoded automatically by Cloudflare, status updates via webhook
- **Database + Auth**: Supabase (Postgres + Auth) — metadata only, never stores
  photo or video bytes
- **AI image features**: ImageKit — R2 registered as external origin; used only for
  on-demand transforms, not primary storage
- **Android**: Capacitor wrapping this same Next.js/React frontend, plus a native
  module for gallery auto-upload (Phase 2)
- **Styling**: [Tailwind CSS / your choice — update this line]

## Folder Structure (target)
```
/app
  /api
    /upload/route.ts        # handles photo upload -> compress -> R2 -> Supabase
    /images/route.ts        # GET list of user's images
    /images/[id]/route.ts   # GET/DELETE single image
    /images/[id]/ai-edit/route.ts  # POST triggers ImageKit AI transform
    /videos/upload-url/route.ts    # creates a Stream TUS upload, writes pending row
    /videos/route.ts               # GET list of user's videos
    /videos/[id]/route.ts          # GET/DELETE single video
    /webhooks/stream/route.ts      # Cloudflare Stream calls this on encode complete/error
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(app)
    /library/page.tsx       # main photo + video grid
    /photo/[id]/page.tsx    # single photo view + AI edit UI
    /video/[id]/page.tsx    # single video view + playback
/lib
  /r2.ts                    # R2 client setup + helper functions
  /stream.ts                # Cloudflare Stream API client + webhook signature verification
  /supabase.ts              # Supabase client setup (server + browser variants)
  /imagekit.ts              # ImageKit URL builder helpers
  /compress.ts              # Sharp compression logic (photos only)
/components
  ...
/supabase
  schema.sql                # database schema, run via Supabase SQL editor or CLI
/android                    # Capacitor Android project (Phase 2)
  /app/src/main/java/.../MediaSyncWorker.kt      # WorkManager periodic job
  /app/src/main/java/.../GalleryContentObserver.kt
.env.example
```

## Environment Variables
See `.env.example` for the full list. Never commit a real `.env` file. Server-only
secrets (R2 keys, Supabase service role key, ImageKit private key) must never be
prefixed with `NEXT_PUBLIC_` and must never be referenced in client components.

## Critical Rules — Do Not Violate
1. **Never import `sharp` in an Edge Runtime route.** Any API route using it must
   explicitly set `export const runtime = 'nodejs'`.
2. **Never expose service-role or secret keys to the client.** `SUPABASE_SERVICE_ROLE_KEY`,
   R2 secret access key, and the ImageKit private key are server-only.
3. **Generate R2 object keys yourself.** R2's `PutObject` does not return an ID —
   always build a key like `${userId}/${uuid}.webp` before uploading.
4. **Compress on upload.** Images over 16MB must be run through Sharp before being
   written to R2. Normalize output to WebP (quality 75–85) unless there's a specific
   reason to preserve the original format.
5. **ImageKit is AI-only.** Never upload images into ImageKit's own media library.
   All AI transforms should be requested via URL against the R2 external origin.
   If a transform result needs to persist, download it and write it back to R2 —
   don't rely on ImageKit as long-term storage.
6. **Keep R2 and Supabase in sync.** Every successful R2 write must be paired with a
   metadata row in the same request/transaction. Never leave an orphaned object in
   R2 with no corresponding Supabase row, or vice versa. If the Supabase insert fails
   after an R2 upload succeeds, delete the R2 object before returning an error.
7. **Enforce per-user isolation everywhere.** Rely on Supabase RLS as the source of
   truth for access control, not just client-side checks. Every query for images
   must be scoped to the authenticated user's ID.
8. **Use signed URLs for private access.** Do not make the R2 bucket public unless a
   feature explicitly requires it (e.g. a "share" feature — out of scope for MVP).
9. **Never route raw video bytes through a Vercel API route.** Vercel's Node.js
   serverless functions cap request bodies at 4.5MB — nowhere near a real video
   file. Video always uploads client → Cloudflare Stream directly via a TUS URL
   your API generates; your backend never sees the file itself.
10. **Never use Sharp on video.** It's an image-only library. All video encoding
    is handled automatically by Cloudflare Stream — don't build or call any
    ffmpeg-based transcoding path unless a future ADR explicitly changes this
    architecture.
11. **Verify the Stream webhook signature before trusting it.** `/api/webhooks/stream`
    receives unauthenticated POSTs from the public internet in the sense that
    anyone could send a request there — the signature check is the only thing
    proving it actually came from Cloudflare. Never skip it, even in development
    shortcuts.
12. **Respect Android's background execution limits.** Don't design a feature
    that assumes `WorkManager` can run more often than its ~15-minute minimum
    interval, and don't fight the OS by requesting excessive wake locks — battery
    complaints from users are a real cost of getting this wrong.
13. **Dedupe auto-uploaded media.** Every write from the Android auto-upload path
    must check the local dedupe table first — a missed check here means the same
    photo/video gets uploaded (and billed) repeatedly.

## Commands
```bash
npm run dev       # local dev server
npm run build     # production build
npm run lint       # lint check
npm run typecheck  # tsc --noEmit
```

## Testing Expectations
- Any new API route touching R2, Supabase, or ImageKit should have at least a basic
  integration test or a manual test checklist noted in the PR description.
- Test the "over 16MB" compression branch explicitly — it's easy to accidentally only
  test with small images during development.
- Test cross-user access denial (User A cannot fetch/delete User B's image) before
  merging any change to the images API.

## Definition of Done for a Feature/PR
- [ ] Follows the rules above (especially #2, #5, #6, #7)
- [ ] No secrets committed or logged
- [ ] Matches the relevant flow described in ARCHITECTURE.md
- [ ] Manually tested the happy path and at least one failure path
- [ ] Lint and typecheck pass
