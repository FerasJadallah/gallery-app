# Gallery App

A full-stack photo album manager built with Next.js App Router and Supabase.

## Tech Choices

- **Supabase** provides Postgres storage, row-level security, and Supabase Storage buckets for image assets. It integrates cleanly with Next.js via the JS client, enabling auth, SQL, and object storage in a single managed service.

## Local Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase project values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   Optionally include the service role key for CLI migrations if you need to run them locally.
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Deployment to Vercel

1. Push the repository to GitHub.
2. Create a new Vercel project from the repo.
3. In the Vercel dashboard, set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Trigger a build. Vercel will run `npm install` and `npm run build` automatically.
5. After the first deploy, run the Supabase migrations (see below) using the Supabase CLI or the dashboard SQL editor.

## Database Schema & Rules

- **Tables**
  - `profiles`: user profile linked to `auth.users` (columns: `id`, `email`, `username`, `full_name`, timestamps).
  - `albums`: stores album metadata (`id`, `user_id`, `title`, `description`, `privacy`, timestamps, `slug`, optional `cover_url`).
  - `album_images`: references `albums` with `album_id`, stores `storage_path` in Supabase Storage and `display_order`.
- **Row-Level Security (Supabase migration `20251001000000_profiles_rls.sql`)**
  - Enable RLS on `profiles`.
  - Insert/update/delete policies restrict changes to the owner (`auth.uid() = id`).
  - Select policy allows authenticated users to read profiles.
  - Trigger `handle_new_user` keeps `profiles` in sync with `auth.users` signups.
- Similar policies should be added for `albums` and `album_images` in production to prevent unauthorized access (currently enforced at the application layer).

## Decisions & Trade-offs

- **Supabase over Firebase**: better SQL workflow, native Postgres, and first-class object storage for image assets.
- **Client-side Supabase access**: Lazily instantiates the client with `getSupabaseClient()` to avoid breaking prerendered routes when env vars are missing.
- **Image handling**: uses Supabase Storage public buckets with pre-signed URLs for simplicity; swapping to signed URLs would improve privacy but adds complexity.
- **Turbopack (Next.js 15)**: opted into Turbopack for faster dev builds, but the build sometimes requires the fallback `NEXT_FORCE_SWC=true next build` in CI due to platform limitations.
- **Known limitations**:
  - No pagination/virtualization for large album lists.
  - Client-side filtering only (no server search).
  - RLS policies for `albums`/`album_images` should be hardened before production.
  - No automated test suite yet; linting is the primary guard.

## Testing & Quality

- Lint and type-check:
  ```bash
  npm run lint
  ```
- Additional integration or unit tests are not set up; add them under `src/__tests__` and run via a chosen test runner (e.g., Vitest/Jest) if needed.

## Supabase Migrations

- Run migrations with the Supabase CLI:
  ```bash
  supabase db push
  ```
  Ensure `SUPABASE_DB_URL` and service role env values are configured when running migrations locally.

## Storage Buckets

- Supabase Storage bucket `album-images` hosts uploaded images.
- Ensure the bucket is public or configure signed access; the app generates public URLs for previews.

## Deployment Checklist

- [ ] Supabase project with `profiles`, `albums`, `album_images` tables.
- [ ] RLS policies applied (profiles migration provided; extend for albums/images).
- [ ] Storage bucket `album-images` created.
- [ ] Vercel env vars configured.
- [ ] Run `npm run lint` and `npm run build` locally before pushing.

Happy shipping! 🚀
