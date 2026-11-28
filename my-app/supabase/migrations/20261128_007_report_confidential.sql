-- supabase/migrations/20261128_007_report_confidential.sql
-- Purpose: confidential reports. A confidential report is visible only to its
--          reporter and to admins — never on the public map, lists or counts.
--          Adds reports.is_confidential, rewrites the reports/verifications/
--          history policies, adds public_report_stats() and the private
--          issue-photos-confidential storage bucket.
-- Run order: 7 of 8 (after 20261128_006_report_workflow.sql).
-- safe to run twice

-- ---------------------------------------------------------------------------
-- reports.is_confidential
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists is_confidential boolean not null default false;
create index if not exists reports_is_confidential_idx on public.reports (is_confidential);

-- ---------------------------------------------------------------------------
-- reports policies: replace the "everyone can read" policy so a confidential
-- report is hidden unless you are its owner or an admin.
-- ---------------------------------------------------------------------------
drop policy if exists "Reports are publicly readable" on public.reports;
drop policy if exists "Reports are visible unless confidential" on public.reports;
create policy "Reports are visible unless confidential"
  on public.reports for select
  to anon, authenticated
  using (is_confidential = false or user_id = auth.uid() or public.is_admin());

-- Inserts: the row must belong to the caller.
drop policy if exists "Signed-in users can create reports" on public.reports;
create policy "Signed-in users can create reports"
  on public.reports for insert
  to authenticated
  with check (user_id = auth.uid());

-- Updates: the owner while the report is still 'reported', admins always.
drop policy if exists "Reporters can update their own reports" on public.reports;
drop policy if exists "Owners can update their reported reports" on public.reports;
create policy "Owners can update their reported reports"
  on public.reports for update
  to authenticated
  using (user_id = auth.uid() and status = 'reported')
  with check (user_id = auth.uid() and status = 'reported');

drop policy if exists "Admins can update any report" on public.reports;
create policy "Admins can update any report"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Deletes: the owner while still 'reported', admins always. (Title/description
-- edits use the update policy above; delete is the destructive one.)
drop policy if exists "Reporters can delete their own reports" on public.reports;
drop policy if exists "Owners can delete their reported reports" on public.reports;
create policy "Owners can delete their reported reports"
  on public.reports for delete
  to authenticated
  using (user_id = auth.uid() and status = 'reported');

drop policy if exists "Admins can delete any report" on public.reports;
create policy "Admins can delete any report"
  on public.reports for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Verifications: only on a report the reader can see. A confidential report may
-- be verified by an admin only (nobody else can see it to verify it).
-- ---------------------------------------------------------------------------
drop policy if exists "Verifications are publicly readable" on public.report_verifications;
create policy "Verifications follow their report's visibility"
  on public.report_verifications for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.is_confidential = false or r.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Signed-in users can verify a report" on public.report_verifications;
create policy "Signed-in users can verify a visible report"
  on public.report_verifications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.is_confidential = false or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Status history: visible when the report is visible.
-- ---------------------------------------------------------------------------
drop policy if exists "Status history is publicly readable" on public.report_status_history;
create policy "Status history follows its report's visibility"
  on public.report_status_history for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.is_confidential = false or r.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Public counts never include confidential reports. This is the single source
-- for the landing page and the public dashboard numbers.
-- ---------------------------------------------------------------------------
create or replace function public.public_report_stats()
returns table (status text, category text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select status, category, count(*)::bigint as total
  from public.reports
  where is_confidential = false
  group by status, category;
$$;

grant execute on function public.public_report_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for confidential photos. Written under auth.uid()/…,
-- read back by the owner or an admin only. 5 MB, image types only.
-- The public "report-images" bucket from schema.sql stays for normal reports.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'issue-photos-confidential',
  'issue-photos-confidential',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Confidential photos readable by owner and admins" on storage.objects;
create policy "Confidential photos readable by owner and admins"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'issue-photos-confidential'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "Owners upload their confidential photos" on storage.objects;
create policy "Owners upload their confidential photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'issue-photos-confidential'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners replace their confidential photos" on storage.objects;
create policy "Owners replace their confidential photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'issue-photos-confidential' and owner = auth.uid());

drop policy if exists "Owners delete their confidential photos" on storage.objects;
create policy "Owners delete their confidential photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'issue-photos-confidential' and owner = auth.uid());
