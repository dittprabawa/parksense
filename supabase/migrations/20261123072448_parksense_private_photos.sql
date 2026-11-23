begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parking-photos', 'parking-photos', false, 5242880, array['image/jpeg','image/png','image/webp']);

create policy parksense_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'parking-photos' and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9]{64}\.(jpg|png|webp)$'
);
create policy parksense_read on storage.objects for select to authenticated using (
  bucket_id = 'parking-photos' and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy parksense_remove_unused on storage.objects for delete to authenticated using (
  bucket_id = 'parking-photos' and (storage.foldername(name))[1] = (select auth.uid()::text)
  and not exists (select 1 from public.parking_sessions s where s.photo_path = storage.objects.name)
);
commit;
