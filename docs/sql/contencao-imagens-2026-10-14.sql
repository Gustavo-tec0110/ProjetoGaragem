-- Requires owner approval. Stop uploads/cleanup and keep maintenance enabled.
-- Preserve bytes and references. Never reopen the public bucket as rollback.
begin;
update storage.buckets set public = false where id = 'project-images';
revoke execute on function public.can_read_project_image(text) from public, anon, authenticated;
revoke execute on function public.claim_unreferenced_project_image(text) from public, anon, authenticated;
revoke execute on function public.claim_stale_pending_modification_photo(text) from service_role;
notify pgrst, 'reload schema';
commit;
