# Supabase — community events

These files add the community-events side of Sajha Pahal (applications, review,
joining, notifications and storage). They are written to be run by hand in the
Supabase dashboard; nothing here is applied automatically.

**Nothing in this folder has been executed.** Write the files, then run them
yourself when you are ready.

## Order

Run them in the **SQL Editor**, in numeric order, **one file at a time**. Each
file starts with a header comment that says which step it is and that it is safe
to run twice, so re-running a file cannot damage data.

| # | File | What it does |
|---|---|---|
| — | `../schema.sql` (already applied) | The reports schema, `profiles` and `touch_updated_at()`. Must exist first. |
| 1 | `migrations/20261128_001_roles.sql` | Adds `profiles.role` (`user` / `admin`), `public.is_admin()`, and a trigger that stops non-admins changing a role. |
| 2 | `migrations/20261128_002_events_tables.sql` | Creates `events`, `event_applications`, `event_participants`, `event_status_history`, `notifications` + indexes. |
| 3 | `migrations/20261128_003_events_rls.sql` | Enables RLS and adds every policy, plus grants. |
| 4 | `migrations/20261128_004_events_triggers.sql` | `updated_at`, the review-field guard, "edited approved event goes back to review", the status timeline, review notifications and participant limits. |
| 5 | `migrations/20261128_005_events_storage.sql` | The public `event-photos` bucket and the private `event-documents` bucket, with per-user folders and size/mime limits. |

Optional, not a migration:

- `seed/events_sample.sql` — six approved example events near Itahari, one per
  type. Replace the placeholder organizer id first.
- `admin/manual_review.sql` — hand-run statements for approving, requesting
  changes, rejecting and promoting an admin, until the admin panel exists.

## Verify

Run these one at a time and compare with the expected result.

```sql
-- Tables exist (expect 5 rows).
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'events', 'event_applications', 'event_participants',
    'event_status_history', 'notifications'
  );

-- Every table has RLS switched on (expect rowsecurity = true for all five).
select relname, relrowsecurity
from pg_class
where relname in (
  'events', 'event_applications', 'event_participants',
  'event_status_history', 'notifications'
);

-- The policies created by file 3 (expect 15 rows).
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'events', 'event_applications', 'event_participants',
    'event_status_history', 'notifications'
  )
order by tablename, policyname;

-- The triggers created by files 1 and 4 (expect 6 rows).
select event_object_table, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'profiles_guard_role', 'events_touch_updated_at',
    'event_applications_touch_updated_at', 'events_before_update',
    'events_log_status', 'events_notify_organizer',
    'event_participants_before_insert'
  )
order by event_object_table, trigger_name;

-- The buckets and their limits (expect 2 rows).
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('event-photos', 'event-documents');

-- Become the first admin (then run the update in admin/manual_review.sql).
select public.is_admin();
```

## Roll back

`rollback/events_rollback.sql` drops the triggers, policies, functions, tables
and buckets created by files 2 to 5, in the right order. It keeps `profiles`,
`profiles.role`, `public.is_admin()` and the reports objects.

**It deletes every event, application, participant, notification and stored
event file.** Read the warning at the top of the file before running it.

## Switch the app from local to Supabase

The app runs on a local browser store out of the box, so it works before any
table exists.

1. In `.env.local` add:

   ```bash
   NEXT_PUBLIC_EVENTS_BACKEND=supabase
   ```

   (default is `local`; see `.env.example`)

2. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   are set, then restart `npm run dev`.
3. Run the five migrations above, in order.
4. Optional: run `seed/events_sample.sql` for example events.
5. Reviews are done by hand with `admin/manual_review.sql` until the admin panel
   exists. The in-app "Dev: simulate admin review" panel is development-only and
   local-backend-only by design.

## Notes

- Local-backend data lives **only in the browser** that created it
  (`localStorage`, keys prefixed `sajha:`). Clearing site data removes it.
- Column names in `migrations/20261128_002_events_tables.sql` match
  `lib/events/supabase.js` exactly.
- Nobody has run these files yet: the Supabase driver in `lib/events/supabase.js`
  is written but **not tested against a live database**.
