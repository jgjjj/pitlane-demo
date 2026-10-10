insert into storage.buckets (id, name, public) values ('tenant-assets', 'tenant-assets', false) on conflict (id) do nothing;
create policy tenant_assets_member_read on storage.objects for select to authenticated using (bucket_id = 'tenant-assets' and public.is_member((storage.foldername(name))[1]::uuid));
create policy tenant_assets_member_insert on storage.objects for insert to authenticated with check (bucket_id = 'tenant-assets' and public.is_member((storage.foldername(name))[1]::uuid));
create policy tenant_assets_member_update on storage.objects for update to authenticated using (bucket_id = 'tenant-assets' and public.is_member((storage.foldername(name))[1]::uuid)) with check (bucket_id = 'tenant-assets' and public.is_member((storage.foldername(name))[1]::uuid));
create policy tenant_assets_member_delete on storage.objects for delete to authenticated using (bucket_id = 'tenant-assets' and public.is_member((storage.foldername(name))[1]::uuid));
