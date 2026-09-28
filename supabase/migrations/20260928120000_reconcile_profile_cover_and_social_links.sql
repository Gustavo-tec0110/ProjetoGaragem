begin;

-- Reconciles environments where the earlier profile-cover migration was not applied.
alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists social_links jsonb;

update public.profiles
set social_links = '{}'::jsonb
where social_links is null;

alter table public.profiles
  alter column social_links set default '{}'::jsonb,
  alter column social_links set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_social_links_object_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_social_links_object_chk
      check (jsonb_typeof(social_links) = 'object');
  end if;
end $$;

-- Preserve safe legacy handles in the extensible JSON structure. Existing links are never overwritten.
update public.profiles
set social_links = jsonb_build_object(
  'instagram',
  'https://www.instagram.com/' || trim(leading '@' from btrim(instagram_handle))
)
where social_links = '{}'::jsonb
  and trim(leading '@' from btrim(coalesce(instagram_handle, ''))) ~ '^[A-Za-z0-9._]{1,30}$';

create or replace view public.public_profiles
with (security_barrier = true) as
select
  id,
  username,
  case
    when position('@' in display_name) > 1 then username::text
    else display_name
  end as display_name,
  avatar_url,
  bio,
  city,
  state,
  instagram_handle,
  is_saves_public,
  is_likes_public,
  cars_count,
  followers_count,
  following_count,
  created_at,
  updated_at,
  cover_url,
  social_links
from public.profiles;

comment on view public.public_profiles is
  'Public-safe profile projection. Excludes email and full_name; use public.profiles only for the authenticated user own row.';

grant select on public.public_profiles to anon, authenticated;
notify pgrst, 'reload schema';

commit;
