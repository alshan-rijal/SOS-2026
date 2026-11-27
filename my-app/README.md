# Sajha Pahal

A community problem-reporting platform: residents report local infrastructure
problems (potholes, drainage, waste, water, streetlights), confirm each other's
reports, and follow every problem from *pending* to *resolved* on a live map.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) |
| UI | React 19, Tailwind CSS 4, [Lucide](https://lucide.dev) icons |
| Data | Supabase (Postgres, Auth, Storage) |
| Maps | Leaflet via `react-leaflet`, OpenStreetMap tiles |

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with the project's public API credentials
   (Supabase → Project Settings → API):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
   ```

   Only ever use the publishable/anon key in this app. The service-role key must
   never be present in the client bundle.

3. Apply the database schema — Supabase → **SQL Editor** → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → Run.

   This creates the `reports`, `report_status_history` and `report_verifications`
   tables, the `report_category_counts` view, the `report-images` storage bucket,
   indexes, and the row-level-security policies the app relies on.

4. Optional — load example records so the dashboard and map are not empty:

   paste [`supabase/seed.sql`](supabase/seed.sql) into the SQL Editor and run it.

5. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/map` | Public | All located reports on a map |
| `/reports` | Public | Searchable, filterable, paginated report list |
| `/reports/[id]` | Public | Report details, photo, map, status timeline |
| `/reports/new` | Signed in | Submit a report (photo + map pin) |
| `/dashboard` | Signed in | Totals, recent reports, map, category breakdown |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Public | Authentication |

## Data rules

Reports are civic records, so the RLS policies in `supabase/schema.sql` allow
**anyone to read** them and **only signed-in users to write**:

- create a report (`user_id = auth.uid()`),
- update or delete their own report,
- add a status-history entry to their own report,
- verify any report once (`report_verifications` has a composite primary key),
- upload to the public `report-images` bucket.

Route protection lives in [`proxy.js`](proxy.js) →
[`lib/supabase/middleware.js`](lib/supabase/middleware.js).
