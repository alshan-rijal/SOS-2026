
```markdown
# Sajha Pahal (साझा पहल)

**Civic Issue Reporting & Community Event Platform for Itahari Sub-Metropolitan City**

Sajha Pahal connects residents of Itahari with municipal authorities to report local infrastructure issues, verify neighbourhood problems, track resolution progress through a five-step civic workflow, and organize approved community events—with full English (`en`) and Nepali (`ne`) bilingual support.

---

## Core Features

### 1. Civic Issue Reporting & Verification
* **Geolocated Reporting:** Citizens submit reports across five municipal categories (*Road & Potholes*, *Water Supply*, *Electricity*, *Waste Management*, *Drainage*) with severity levels (`low`, `medium`, `high`, `critical`), interactive map coordinates, and photo evidence.
* **Community Verification:** Signed-in residents can verify nearby reports to confirm active issues and surface recurring problem-prone zones on the map.
* **5-Step Municipal Workflow:** Reports progress through `reported` → `under_verification` → `in_progress` → `fixed` / `cannot_fix`, with automatic status history logging, official municipal notes, and mandatory reason enforcement when marking a report `cannot_fix` (minimum 10 characters) or moving a status backwards.
* **Confidential Reporting (`is_confidential`):** Sensitive reports are hidden from public feeds, maps, and `public_report_stats()` aggregates—accessible only to the original reporter and municipal admins, with evidence stored in a private `issue-photos-confidential` bucket.

### 2. Community Events & Approval Queue
* **Multi-Step Event Submission:** Organisers submit local initiatives (clean-up drives, health camps, donation drives) with venue pinpointing, cover imagery (`event-photos`), and supporting verification documents (`event-documents`).
* **Admin Moderation:** Submissions land in `event_applications` for municipal review (`pending` → `approved` / `rejected`) before appearing publicly on `/events`.

### 3. Authority & Municipal Panel (`/admin-panel`)
* **Protected Access:** Guarded at both the Next.js middleware/server layer (`app/admin-panel/page.js`) and PostgreSQL Row-Level Security (`public.is_admin()`).
* **Civic Analytics & Export:** Real-time KPI cards, category distribution bar charts, 14-day submission volume trends, workflow status breakdowns, and UTF-8 BOM CSV export (preserving Nepali Devanagari text).
* **Triage & Auditability:** Filter by ward/keyword, category, severity, or status; attach official notes; toggle confidentiality; and review event applications with signed document links.

### 4. Bilingual Experience (English / नेपाली)
* Instant language switching across navigation, categories, severities, workflow statuses, forms, and localized content fields (`title_ne`, `description_ne`, `location_name_ne`).

---

## Tech Stack

* **Framework:** Next.js 16 (App Router, Turbopack) & React 19
* **Styling & UI:** Tailwind CSS, Lucide Icons, Recharts
* **Mapping:** Leaflet / React-Leaflet (centered on Itahari: `26.6646, 87.2718`)
* **Backend & Auth:** Supabase (PostgreSQL, Row-Level Security, Auth with Email/Password & Google OAuth, Storage)

---

## Project Structure

```text
├── app/
│   ├── admin-panel/          # Protected municipal command & triage dashboard
│   ├── dashboard/            # Citizen overview, personal stats, and activity
│   ├── events/               # Public community events feed & /events/new form
│   ├── login/ & register/    # Authentication routes
│   ├── map/                  # Interactive civic map & problem-prone zone clusters
│   ├── profile/              # Citizen profile, avatar upload, and submissions
│   └── reports/              # Public report directory, detail stepper & /reports/new
├── components/
│   ├── admin/                # Admin moderation & review components
│   ├── AdminDashboard.jsx    # Analytics charts, report triage table & event queue
│   ├── EventForm.jsx         # Multi-step event application wizard
│   └── LanguageContext.jsx   # EN/NE translation provider
├── lib/
│   ├── events.js             # Event CRUD, storage uploads & backend toggle
│   ├── i18n.js               # Bilingual dictionary and field localizer
│   ├── reports.js            # Report workflow constants, geography & Supabase queries
│   └── supabase/             # Browser, server, and middleware SSR clients
└── supabase/
    ├── schema.sql            # Base tables, views, triggers, and buckets
    ├── migrations/           # Incremental SQL migrations (roles, events, workflow, RLS)
    └── rollback/             # Idempotent rollback scripts

```

---

## Getting Started

### 1. Prerequisites

* Node.js 20+
* A Supabase project with Email and/or Google OAuth enabled

### 2. Install Dependencies

```bash
npm install

```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
NEXT_PUBLIC_EVENTS_BACKEND=supabase

```

> **Note:** `NEXT_PUBLIC_EVENTS_BACKEND=supabase` switches event creation and document uploads from browser `localStorage` to Supabase tables and storage buckets. Restart the dev server whenever `.env.local` changes.

### 4. Database & Storage Setup (Supabase SQL Editor)

Run the SQL files in **Supabase Dashboard → SQL Editor** in the following order:

1. `supabase/schema.sql` — Core tables (`profiles`, `reports`, `report_verifications`, `report_status_history`), views, and `report-images` / `avatars` buckets.
2. `supabase/migrations/20261128_001_roles.sql` — Role column (`user`, `admin`) and `public.is_admin()` helper.
3. `supabase/migrations/20261128_002_events_tables.sql` & `003_events_rls.sql` — Event application tables and RLS policies.
4. `supabase/migrations/20261128_006_bilingual_content.sql` — Nepali (`_ne`) columns for bilingual content.
5. `supabase/migrations/20261128_006_report_workflow.sql` — Converts `reports.status` to the 5-step workflow (`reported`, `under_verification`, `in_progress`, `fixed`, `cannot_fix`) and installs status history & review-guard triggers.
6. `supabase/migrations/20261128_007_report_confidential.sql` — Adds `is_confidential`, visibility RLS policies, `public_report_stats()`, and the private `issue-photos-confidential` bucket.
7. `supabase/migrations/20261128_008_admin_and_storage.sql` — Configures `event-photos` (public, 1 MB) and `event-documents` (private, 5 MB) buckets and reloads the PostgREST schema cache (`notify pgrst, 'reload schema';`).

### 5. Grant Admin Access

Promote an existing user account to municipal admin in the **SQL Editor**:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-AUTH-USER-UUID';

```

### 6. Run the Development Server

```bash
npm run dev

```

Open `http://localhost:3000` to view the application.

---

## Security & RLS Architecture

* **Role Escalation Protection:** `public.is_admin()` runs as `SECURITY DEFINER` with `search_path = public` to prevent infinite RLS recursion, while `profiles` update policies block non-admins from modifying their own `role`.
* **Database-Level Workflow Guards:** `BEFORE UPDATE` triggers on `public.reports` reject status/review field changes from non-admins, require a `status_reason` on backward transitions, and enforce a ≥10-character reason for `cannot_fix`.
* **Private Storage Isolation:** `event-documents` and `issue-photos-confidential` store files under `{user_id}/...` paths and restrict `SELECT` access to the file owner and `public.is_admin()` via signed URLs.

```

Let me know if you'd like to customize any sections (such as adding screenshots, contributor credits, or Vercel deployment steps) before saving it to your repository.

```
