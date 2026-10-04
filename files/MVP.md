# MVP Scope

## Goal
Ship the smallest version of the product that proves the core loop: a user can
securely store photos cheaply, and optionally run one AI edit on a photo. Everything
else is deferred.

## P0 — Must ship for MVP
- [ ] Email/password auth via Supabase
- [ ] Upload flow: pick file(s) → compress if >16MB → upload to R2 → save metadata row
- [ ] Photo grid view (thumbnails, paginated)
- [ ] Full-size photo view
- [ ] One AI feature: background removal (via ImageKit, R2 as external origin)
- [ ] Download original and download AI-edited result
- [ ] Delete a photo (removes from R2 + Supabase)
- [ ] Per-user data isolation (RLS in Supabase, signed URLs for R2 access)
- [ ] Basic storage usage indicator (GB used / GB allotted)

## P1 — Nice to have for v1, cut if time-constrained
- [ ] Second AI feature: background redesign/replace
- [ ] Search or filter photos by upload date
- [ ] Drag-and-drop multi-file upload with progress bar
- [ ] Thumbnail generation (separate smaller variant for grid view, full-res on click)
- [ ] Basic error/retry handling on failed uploads

## Explicitly Out of Scope for v1
- Shared/team folders
- Payment/billing integration
- Offline support / PWA caching
- Any AI feature beyond background removal + redesign
- Admin dashboard

(Video support and the Android app moved out of "out of scope" — see Phase 2 below.
They are deliberately still excluded from the *initial* MVP ship so the core
photo loop ships first, but they're now a defined next milestone, not a vague future.)

## Phase 2 — Video + Android Auto-Upload
Ships immediately after the core MVP above. Full technical detail in ARCHITECTURE.md.

### P0 for Phase 2
- [ ] Video upload via Cloudflare Stream (TUS resumable upload, client → Stream directly)
- [ ] `videos` table in Supabase, linked to the Stream video ID
- [ ] Webhook endpoint that flips a video's status from `processing` to `ready`/`error`
- [ ] "Processing" state in the library grid for videos not yet encoded
- [ ] Video playback via Stream's signed URLs
- [ ] Android app shell via Capacitor, wrapping the existing web UI
- [ ] `ContentObserver` — detects new gallery photos/videos while the app is open
- [ ] `WorkManager` periodic job — catches anything missed while the app was closed
  (accept the ~15-minute minimum interval Android enforces)
- [ ] Local dedupe (photo/video URI or hash → uploaded flag) so nothing double-uploads
  across the two detection paths

### P1 for Phase 2
- [ ] On-device video compression before upload (Android `Media3 Transformer`) to
  cut upload time and Stream storage cost
- [ ] "Wi-Fi only" toggle for auto-upload, to avoid burning mobile data
- [ ] Battery-optimization-exemption prompt for more reliable background sync

### Acceptance Criteria for Phase 2
1. A user can upload a video from the web app and see it move from "processing" to
   playable without refreshing the page (webhook-driven, not polling).
2. Taking a photo or video on an Android phone with the app installed results in it
   appearing in the user's library without manually opening the app, within a
   reasonable window (near-instant if the app was recently open, within ~15 minutes
   otherwise).
3. No photo or video is ever uploaded twice by the Android auto-upload path.
4. A video never touches a Vercel API route as raw file bytes at any point in the flow.

## Acceptance Criteria (Definition of "MVP is done")
1. A new user can sign up, log in, and land on an empty library.
2. A user can upload 5 photos of varying sizes (including one >16MB) and all appear
   correctly compressed in their library within a few seconds each.
3. A user can open a photo and successfully remove its background, see a preview,
   and save the result as a new image.
4. A user cannot see or access another user's photos under any circumstance
   (verify by testing with two accounts).
5. A user can delete a photo and confirm it's gone from both the UI and R2.
6. The app is deployed and reachable on Vercel with all three third-party services
   (R2, Supabase, ImageKit) wired to production credentials.
