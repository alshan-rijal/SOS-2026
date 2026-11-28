-- 06_confidential.sql
-- Purpose: add reports.is_confidential and the private-photo bucket, and make
--          confidential reports visible only to their owner and admins — off
--          the public map, lists and counts.
-- Run order: 06 (after 05; run alone, then 07).
-- safe to run twice: add column if not exists, create or replace, drop policy
--                    if exists before create policy.

-- ---------------------------------------------------------------------------
-- reports.is_confidential
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists is_confidential boolean not null default false;
create index if not exists reports_is_confidential_idx on public.reports (is_confidential);

-- ---------------------------------------------------------------------------
-- reports policies
-- ---------------------------------------------------------------------------
drop policy if exists "Reports are publicly readable" on public.reports;
drop policy if exists "Reports are visible unless confidential" on public.reports;
create policy "Reports are visible unless confidential"
  on public.reports for select
  to anon, authenticated
  using (is_confidential = false or user_id = auth.uid() or public.is_admin());

drop policy if exists "Signed-in users can create reports" on public.reports;
create policy "Signed-in users can create reports"
  on public.reports for insert
  to authenticated
  with check (user_id = auth.uid() and not public.is_admin());

-- ---------------------------------------------------------------------------
-- report_verifications — same visibility as the report it belongs to.
-- (07 tightens the insert policy further.)
-- ---------------------------------------------------------------------------
drop policy if exists "Verifications are publicly readable" on public.report_verifications;
drop policy if exists "Verifications follow their report's visibility" on public.report_verifications;
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
drop policy if exists "Signed-in users can verify a visible report" on public.report_verifications;
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
-- report_status_history — same visibility as the report it belongs to.
-- ---------------------------------------------------------------------------
drop policy if exists "Status history follows its report's visibility" on public.report_status_history;
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
-- public_report_stats() — the public counts the landing page reads. Never
-- includes confidential reports. security definer so it can aggregate rows the
-- caller cannot see.
-- ---------------------------------------------------------------------------
create or replace function public.public_report_stats()
returns table (status text, category text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select status::text as status, category, count(*)::bigint as total
  from public.reports
  where is_confidential = false
  group by status::text, category;
$$;

grant execute on function public.public_report_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: the private bucket for confidential photos.
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

-- Read: the uploader's own folder, or an admin.
drop policy if exists "Confidential photos readable by owner and admins" on storage.objects;
create policy "Confidential photos readable by owner and admins"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'issue-photos-confidential'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Write: only into the uploader's own folder.
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
