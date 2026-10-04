# AI-Enhanced Cloud Photo Storage

A Next.js app for storing photos on Cloudflare R2, with metadata tracked in Supabase
and on-demand AI editing (background removal/redesign) via ImageKit.

## Docs
- [`PRD.md`](./PRD.md) — what this product is and why
- [`MVP.md`](./MVP.md) — what ships first
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — how it's built, data flows, API routes
- [`AGENTS.md`](./AGENTS.md) — rules for any coding agent working in this repo

## Stack
Next.js (App Router) · TypeScript · Cloudflare R2 · Sharp · Cloudflare Stream ·
Supabase · ImageKit · Vercel · Capacitor (Android, Phase 2)

## Setup

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   npm install
   ```

2. **Set up Cloudflare R2**
   - Create a bucket in the Cloudflare dashboard.
   - Create an R2 API token (Account > R2 > Manage API Tokens) with read/write access.
   - Note your Account ID, Access Key ID, and Secret Access Key.

3. **Set up Supabase**
   - Create a project at supabase.com.
   - Run `supabase/schema.sql` in the SQL editor to create tables and RLS policies.
   - Note your project URL, anon key, and service role key.

4. **Set up ImageKit**
   - Create an account at imagekit.io.
   - Add your R2 bucket as an external origin (Developer Options > External Storage,
     or the External Origins section — check current ImageKit docs for exact steps,
     UI changes over time).
   - Note your public key, private key, and URL endpoint.

5. **Set up Cloudflare Stream (Phase 2, video)**
   - Enable Stream in the Cloudflare dashboard for your account.
   - Create a Stream-scoped API token (Account > API Tokens) with Stream read/write
     permissions.
   - Register a webhook pointing at `https://<your-deployed-domain>/api/webhooks/stream`
     and note the webhook signing secret — you'll need a publicly reachable URL for
     this, so webhook delivery only works against a deployed environment (or a
     tunnel like ngrok for local testing).

6. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # fill in all values
   ```

7. **Run locally**
   ```bash
   npm run dev
   ```
   App runs at http://localhost:3000

## Deploying to Vercel
1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repo in Vercel.
3. Add all variables from `.env.example` to the Vercel project's Environment Variables
   settings (Production and Preview).
4. Deploy.
5. Once deployed, go back to the Cloudflare Stream webhook settings and confirm the
   webhook URL points at your live domain (not localhost).

## Building the Android app (Phase 2)
The Android app lives in `/android` and is the same web frontend wrapped by Capacitor,
plus native gallery-sync code.
```bash
npx cap sync android
npx cap open android   # opens the project in Android Studio
```
From Android Studio: build and run on a device/emulator as normal. The auto-upload
worker (`MediaSyncWorker.kt`) and the live observer (`GalleryContentObserver.kt`)
both call the same `/api/upload` and `/api/videos/upload-url` routes the web app
uses, authenticated with the same Supabase session — no separate backend needed.

## Notes
- `sharp` requires the Node.js runtime — any route using it must set
  `export const runtime = 'nodejs'`. Vercel supports this out of the box.
- Video never passes through a Next.js API route as raw bytes — Vercel's 4.5MB
  request body limit makes that impossible. Video always uploads client → Cloudflare
  Stream directly.
- Never commit `.env.local` or any real credentials.
- See `AGENTS.md` before making structural changes — it documents the rules this
  project is built around (R2 as sole photo storage, Stream as sole video storage,
  ImageKit as AI-only, RLS enforcement, webhook signature verification, etc).
