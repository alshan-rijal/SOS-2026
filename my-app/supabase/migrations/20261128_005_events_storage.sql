-- supabase/migrations/20261128_005_events_storage.sql
-- Purpose: the event photo bucket (public) and the event document bucket
--          (private), with per-user folders and file limits.
-- Run order: 5 of 5.
-- safe to run twice

-- ---------------------------------------------------------------------------
-- Buckets. on conflict do update so re-running also repairs the limits.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  1048576, -- 1 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-documents',
  'event-documents',
  false,
  5242880, -- 5 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- event-photos: readable by everyone, writable only inside your own folder.
-- ---------------------------------------------------------------------------
drop policy if exists "Event photos are publicly readable" on storage.objects;
create policy "Event photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'event-photos');

drop policy if exists "Users can upload their own event photos" on storage.objects;
create policy "Users can upload their own event photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own event photos" on storage.objects;
create policy "Users can update their own event photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own event photos" on storage.objects;
create policy "Users can delete their own event photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- event-documents: private. Only the owner's folder, plus admin read.
-- ---------------------------------------------------------------------------
drop policy if exists "Event documents are readable by the owner or admins" on storage.objects;
create policy "Event documents are readable by the owner or admins"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'event-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "Users can upload their own event documents" on storage.objects;
create policy "Users can upload their own event documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own event documents" on storage.objects;
create policy "Users can update their own event documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own event documents" on storage.objects;
create policy "Users can delete their own event documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
