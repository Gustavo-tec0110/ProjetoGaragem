begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  car_id uuid references public.cars(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_chk check (
    type in (
      'project_comment',
      'project_like',
      'project_save',
      'project_follow',
      'project_update'
    )
  )
);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, read_at, created_at desc);
create index if not exists idx_notifications_car_id
  on public.notifications (car_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_system" on public.notifications
for insert to authenticated with check (actor_id = auth.uid() and user_id <> auth.uid());

grant select, update on public.notifications to authenticated;
grant insert on public.notifications to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-images',
  'project-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_images_read_public" on storage.objects;
create policy "project_images_read_public"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'project-images');

drop policy if exists "project_images_insert_own_folder" on storage.objects;
create policy "project_images_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_images_update_own_folder" on storage.objects;
create policy "project_images_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "project_images_delete_own_folder" on storage.objects;
create policy "project_images_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';

commit;
