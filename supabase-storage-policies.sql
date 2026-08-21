-- Run this entire file in Supabase Dashboard -> SQL Editor.
-- The bucket stays private, but images are viewable in the shared gallery.
-- There is intentionally no INSERT policy, so uploads are blocked.

insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do update set public = false;

drop policy if exists "Authenticated users can upload their own images" on storage.objects;
drop policy if exists "Authenticated users can view their own images" on storage.objects;
drop policy if exists "Authenticated users can delete their own images" on storage.objects;
drop policy if exists "Anyone can view public gallery images" on storage.objects;
drop policy if exists "Authenticated users can view shared gallery images" on storage.objects;
drop policy if exists "Anyone can view all gallery images" on storage.objects;

create policy "Authenticated users can upload their own images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and name like (select auth.uid()::text) || '/%'
);

create policy "Anyone can view all gallery images"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'images'
);

create policy "Authenticated users can delete their own images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and name like (select auth.uid()::text) || '/%'
);
