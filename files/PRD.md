# Product Requirements Document (PRD)

## Project Name
[Working title] — AI-Enhanced Cloud Photo Storage

## 1. Overview
A personal cloud photo storage app. Users upload photos, which are compressed and
stored cheaply on Cloudflare R2. Users can browse their library and optionally apply
AI-powered edits (background removal, background redesign, retouching, etc.) to any
photo on demand. Storage is the core product; AI editing is a premium layer on top of it.

## 2. Problem Statement
Off-the-shelf cloud storage (Google Photos, iCloud, Dropbox) is either expensive at
scale, locks users into an ecosystem, or doesn't offer built-in AI photo editing without
a separate paid tool. This product combines cheap, portable object storage with
on-demand AI editing, without paying for both storage AND AI processing through the
same expensive vendor.

## 3. Target Users
- Individuals who want a private, low-cost photo backup (initial target: ~10 users,
  ~50GB each).
- Users who occasionally want to clean up or repurpose a photo (remove/replace
  background) without opening a separate editor.

## 4. Goals & Success Metrics
| Goal | Metric |
|---|---|
| Reliable storage | 0 data loss incidents; successful upload rate > 99% |
| Low cost per user | Infra cost stays under $X/user/month at current scale |
| Useful AI features | > X% of active users use at least one AI edit per month |
| Fast library browsing | Thumbnail grid loads in < 1.5s for a 1,000-photo library |

## 5. Core User Flows
1. **Sign up / log in** — email/password or OAuth via Supabase Auth.
2. **Upload photo(s)** — drag-drop or file picker, single or batch upload.
3. **Browse library** — grid view of thumbnails, sorted by date, paginated/infinite scroll.
4. **View a photo** — full-resolution view, with an "Edit with AI" action.
5. **Apply an AI edit** — choose background removal / background redesign / retouch;
   preview result; save as a new version or replace.
6. **Download** — original or AI-edited version.
7. **Delete** — remove a photo (and its edited variants) permanently.
8. **View storage usage** — simple dashboard showing GB used of their allotment.
9. **Upload video(s)** — same entry point as photo upload; video is routed to
   Cloudflare Stream instead of R2, and shows a "processing" state until encoding
   completes (see ARCHITECTURE.md).
10. **Auto-upload from Android gallery** — once the Android app is installed and
    granted permission, new camera photos/videos upload automatically in the
    background, without the user opening the app (see ARCHITECTURE.md for the
    accuracy/timing caveats — this is near-real-time, not instant).

## 6. Functional Requirements (MVP)
- **FR-1**: Users can sign up and log in (Supabase Auth).
- **FR-2**: Users can upload one or more images (JPEG, PNG, WebP, HEIC).
- **FR-3**: Any image over 16MB is compressed server-side (Sharp) before it is written to R2.
- **FR-4**: Every stored image has a corresponding metadata row in Supabase (owner,
  R2 key, size, mime type, created_at).
- **FR-5**: Users can view a paginated grid of their own images only.
- **FR-6**: Users can request an AI background removal on any of their images.
- **FR-7**: Users can download the original or the AI-edited result.
- **FR-8**: Users can delete an image, which removes it from R2 and Supabase.
- **FR-9**: A user can only ever access their own images (enforced at the DB and API level).
- **FR-10**: Users can upload video files; videos over the direct-upload size are
  sent via a resumable (TUS) upload directly to Cloudflare Stream.
- **FR-11**: A video shows a "processing" status in the library until Cloudflare
  Stream's webhook confirms encoding is complete.
- **FR-12**: The Android app detects new photos/videos in the device gallery and
  uploads them automatically, without requiring the user to open the app for
  every item (subject to Android's background-execution limits — see
  ARCHITECTURE.md).

## 7. Non-Functional Requirements
- **Security**: R2 bucket is private; all access goes through signed URLs or the app's
  own API. Supabase Row Level Security (RLS) enforces per-user data isolation.
- **Cost**: Storage layer must stay near-linear with GB stored (R2), not spike due to
  vendor lock-in on a bundled storage+CDN+AI product.
- **Performance**: Upload compression should not block the UI for more than a couple
  seconds on typical phone-camera-sized photos.
- **Portability**: Because storage lives in R2 (S3-compatible), the app should not be
  hard-coded to any one AI vendor for the storage path.

## 8. Tech Stack
- **Frontend/Backend**: Next.js (App Router), TypeScript, deployed on Vercel
- **Object storage (photos)**: Cloudflare R2 (S3-compatible API)
- **Compression (photos)**: `sharp` (Node.js runtime API routes only)
- **Video storage, encoding & delivery**: Cloudflare Stream — uploads (via TUS),
  automatic multi-bitrate encoding, signed playback URLs, and webhook-based status
  updates; not R2, and not Sharp (Sharp cannot process video)
- **Database/Auth**: Supabase (Postgres + Auth), metadata only — no photo bytes;
  stores Cloudflare Stream video IDs for video rows
- **AI image features**: ImageKit, configured with R2 as an external origin — used only
  for on-demand AI transforms, not as primary storage
- **Android app**: Capacitor wrapping the existing Next.js/React frontend, plus a
  native module for gallery auto-upload (`ContentObserver` for foreground detection,
  `WorkManager` for periodic background sync)

## 9. Constraints
- Images over 16MB are compressed before upload; images under that threshold may be
  stored close to as-is (still normalized to WebP for consistency — see ARCHITECTURE.md).
- Videos are never routed through a Vercel API route as raw bytes — Vercel's Node.js
  serverless functions cap request bodies at 4.5MB, far below any real video file.
  All video upload happens client → Cloudflare Stream directly.
- Initial target scale: 10 users × 50GB (500GB total photo storage); video storage
  is billed separately by Cloudflare Stream (per-minute, not per-GB).
- ImageKit is scoped to AI transforms only, to avoid paying for storage/bandwidth twice.
- Android background auto-upload is bound by OS limits: `WorkManager` periodic jobs
  run at minimum ~15-minute intervals; there is no way to guarantee instant background
  upload on Android (or at all on iOS) from outside a native app.

## 10. Out of Scope for MVP
- Shared albums / multi-user folders
- Desktop sync client
- Real-time collaborative editing
- iOS app (Android is the first native platform; iOS background photo/video access
  is significantly more restricted by Apple and is a separate scoping exercise)

Video support and the Android app were originally deferred past MVP but have since
been scoped in detail (see ARCHITECTURE.md) and are tracked as **Phase 2** in MVP.md,
immediately following the core photo-storage MVP rather than an undated "someday."

## 11. Future Phases (Post-MVP)
- **Phase 2**: Video upload/storage (Cloudflare Stream) + Android auto-upload app
  (Capacitor) — see MVP.md
- **Phase 3+**: iOS app, shared/collaborative albums, additional AI features
  (upscaling, generative fill, auto-tagging/search), storage tiering (move cold
  photos to R2 Infrequent Access), usage-based billing per user
