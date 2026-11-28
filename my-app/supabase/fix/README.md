# Report status fix — run order and reference

These files repair `public.reports.status` on the live database, which still has
the old `report_status` enum plus a check constraint that only allows the old
values, so writing `'reported'` fails with `23514`. Migration `006` never ran, so
the history table, the review columns and the triggers are missing; `007` and
`008` did not run either.

**One file per run.** Paste each file into the Supabase SQL Editor and run it on
its own. Postgres cannot use a new enum value in the same transaction that added
it, so `00`–`08` must not be combined. Every file is written to be safe to run
twice.

## Real names these files rely on (read from schema.sql, migrations and the app)

- Table `public.reports` — columns used: `id`, `created_at`, `updated_at`,
  `user_id`, `reporter_name`, `title`, `description`, `category`, `severity`,
  `status`, `location_name`, `latitude`, `longitude`, `image_url`; added here:
  `status_reason`, `status_changed_at`, `status_changed_by`, `verified_at`,
  `verified_by`, `resolved_at`, `official_note`, `is_confidential`.
- Enum `public.report_status` (labels today: `pending`, `in_progress`,
  `resolved`, `reported`, `under_verification`, `fixed`, `cannot_fix`).
- Constraint `reports_status_check` (rebuilt) and `reports_cannot_fix_reason_check`.
- Table `public.report_status_history` — column named `report_id` (not
  `report_uuid`); columns added: `from_status`, `to_status`, `reason`, `note`,
  `changed_by`, `created_at`. Index `report_status_history_created_idx`.
- Table `public.report_verifications` — `report_id`, `user_id`, `created_at`
  (the app counts it as `report_verifications(count)`).
- Table `public.profiles` — `id`, `full_name`, `role`.
- Table `public.admin_audit_log` — `id`, `admin_id`, `action`, `entity`,
  `entity_id`, `details`, `created_at`.
- Events tables (guarded with `to_regclass`): `public.events`,
  `public.event_participants`.
- Function `public.is_admin()`; functions `public.reports_log_status()`,
  `public.reports_log_initial_status()`, `public.reports_guard_review_fields()`,
  `public.block_admin_write()`, `public.public_report_stats()`.
- View `public.report_category_counts` (no status filter — left alone).
- Bucket `storage.buckets` id `issue-photos-confidential` (private).

## Run order and what to expect

| file | does | expect |
| --- | --- | --- |
| `00_diagnose.sql` | read-only snapshot | enum labels, the old constraint, counts, triggers/policies/views, admins, which columns exist |
| `01_enum_values.sql` | add the four new enum labels if missing | success; run alone so the labels commit |
| `02_status_constraint_open.sql` | open the constraint to all seven values, default `reported`, add the review columns | `ALTER TABLE` messages; writes of `reported` now accepted |
| `03_status_data_migration.sql` | `pending`→`reported`, `resolved`→`fixed` | a short `after migration` count table; the old literals query should be empty |
| `04_status_constraint_final.sql` | five-value check + cannot-fix reason check | a notice if old rows remain; then the two constraints |
| `05_status_history_and_triggers.sql` | `profiles.role` `user/admin`, `is_admin()`, the history table + backfill + triggers + RLS, reports update/delete policies | history table with one `to_status='reported'` row per report |
| `06_confidential.sql` | `is_confidential`, visibility policies, `public_report_stats()`, the private bucket | reads with `is_confidential` stop returning 42703 |
| `07_admin_audit_separation.sql` | `admin_audit_log`, indexes, admin-insert guards, verification policy | admin panel audit reads work |
| `08_verify.sql` | read-only proof | see below |

`03` fix-up note: no policy, view or function in this database compares
`'pending'` / `'resolved'` (the only view, `report_category_counts`, groups by
`category`). `03` prints any it finds; the old literals live in `lib/reports.js`
(app code), which handles both vocabularies already.

## Reading 08

All seven labels; the two `reports_status_check` /
`reports_cannot_fix_reason_check`; no `pending`/`resolved` in the counts; all
eight review columns; four triggers; the reports policy set; the history columns;
your admin list. The commented `update … returning id, status;` at the bottom is
the manual smoke test — replace the id, run it, then set the row back.

## Promote an admin

```sql
update public.profiles set role = 'admin' where id = 'USER-ID';
```

(Run it in the SQL Editor, where `auth.uid()` is null, so the role guard allows
it.)

## Roll back

`99_rollback.sql` undoes 04–07 only: it drops the new triggers, policies,
functions, the history and audit tables and the `is_confidential` column, maps
`fixed`→`resolved` and `reported`→`pending`, and re-opens the constraint to all
seven values. It warns that the history and audit data are lost and never drops
`profiles`, `reports` or enum values. `profiles.role` and the 02 review columns
are left in place (dropping them would break `is_admin()` and lose data).

## Troubleshooting

| error | meaning | fix |
| --- | --- | --- |
| `22P02 invalid input value for enum` | a query used a value the enum does not have | run `01`; if it persists, the value is genuinely absent from `report_status` |
| `23514 violates check constraint reports_status_check` | the old three-value check is still in place | run `02` then `04` |
| `42703 column does not exist` (e.g. `is_confidential`, `status_reason`) | a column was never added | run `02` and `06` |
| `42501 row-level security` / permission denied | signed in as a non-admin, or the admin-insert guard fired | promote the account (above); remember admins cannot file reports or verify |
| `23502 not-null` on `report_status_history` | a legacy `status NOT NULL` column survived | `05` relaxes it; re-run `05` |

No file here was executed or connected to a database.
